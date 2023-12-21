"""Manages synchronization of Model data, between external and internal stores"""
from copy import deepcopy
from json.decoder import JSONDecodeError

from flask import current_app
from jmespath import search as json_search
import requests

from patientsearch.audit import audit_entry, audit_HAPI_change
from patientsearch.models.bearer_auth import BearerAuth


def add_identifier_to_resource_type(bundle, resource_type, identifier):
    result = deepcopy(bundle)
    if "entry" not in result:
        return result

    for resource in result["entry"]:
        if resource.get("resourceType") != resource_type:
            continue
        identifiers = resource.get("identifier", [])
        found = False
        for i in identifiers:
            if (
                i.get("system", "") == identifier.system
                and i.get("value", "") == identifier.value
            ):
                found = True
                break
        if not found:
            identifiers.append(identifier)
            resource["identifier"] = identifiers
    return result


def HAPI_request(
    token, method, resource_type=None, resource_id=None, resource=None, params=None
):
    """Execute HAPI request on configured system - return JSON

    :param token: validated JWT to include in request for auth
    :param method: HTTP verb, POST, PUT, GET, DELETE
    :param resource_type: String naming desired such as ``Patient``
    :param resource_id: Optional, used when requesting specific resource
    :param resource: FHIR resource used in PUT/POST
    :param params: Optional additional search parameters

    """
    from patientsearch.api import current_user_info

    url = current_app.config.get("MAP_API")
    if resource_type:
        url = url + resource_type

    if resource_id is not None:
        if not resource_type:
            raise ValueError("resource_type required when requesting by id")
        url = "/".join((url, str(resource_id)))

    VERB = method.upper()
    if VERB == "GET":
        # By default, HAPI caches search results for 60000 milliseconds,
        # meaning new patients won't immediately appear in results.
        # Disable caching until we find the need and safe use cases
        headers = {"Cache-Control": "no-cache"}
        try:
            resp = requests.get(
                url, auth=BearerAuth(token), headers=headers, params=params, timeout=30
            )
        except requests.exceptions.ConnectionError as error:
            current_app.logger.exception(error)
            raise RuntimeError("EMR FHIR store inaccessible")
    elif VERB == "POST":
        resp = requests.post(
            url, auth=BearerAuth(token), params=params, json=resource, timeout=30
        )
    elif VERB == "PUT":
        resp = requests.put(
            url, auth=BearerAuth(token), params=params, json=resource, timeout=30
        )
    elif VERB == "DELETE":
        # Only enable deletion of resource by id
        if not resource_id:
            raise ValueError("'resource_id' required for DELETE")
        resp = requests.delete(url, auth=BearerAuth(token), timeout=30)
    else:
        raise ValueError(f"Invalid HTTP method: {method}")

    try:
        resp.raise_for_status()
    except requests.exceptions.HTTPError as err:
        current_app.logger.exception(err)
        audit_entry(
            f"Failed HAPI call ({method} {resource_type} {resource_id} {resource} {params}): {err}",
            extra={"tags": ["Internal", "Exception", resource_type]},
            level="error",
        )
        raise ValueError(err)

    # Fencing out - too much noise.  All API endpoints should audit when appropriate
    if False and VERB != "GET":
        audit_HAPI_change(
            user_info=current_user_info(token),
            method=method,
            resource=resource,
            resource_type=resource_type,
            resource_id=resource_id,
        )
    return resp.json()


def external_request(token, resource_type, params):
    """Execute request on configured "external" system - return JSON

    :param token: validated JWT to include in request for auth
    :param resource_type: String naming desired such as ``Patient``
    :param params: Search parameters

    """
    from patientsearch.api import current_user_info

    if not resource_type:
        raise ValueError("Required `resource_type` not included")
    if not current_app.config.get("EXTERNAL_FHIR_API"):
        raise ValueError("config var EXTERNAL_FHIR_API not defined; can't continue")

    user = current_user_info(token)
    if "DEA" not in user:
        raise ValueError("DEA not found")
    search_params = dict(deepcopy(params))  # Necessary on ImmutableMultiDict
    search_params["DEA"] = user.get("DEA")
    url = current_app.config.get("EXTERNAL_FHIR_API") + resource_type
    resp = requests.get(url, auth=BearerAuth(token), params=search_params, timeout=30)
    try:
        resp.raise_for_status()
    except requests.exceptions.HTTPError as err:
        try:
            msg = resp.json().get("message") or err
        except JSONDecodeError:
            msg = resp.text or err
        extra = {"tags": ["PDMP", "search", "error"], "patient": params, "user": user}
        audit_entry(msg, extra=extra, level="error")
        current_app.logger.exception(err)
        raise RuntimeError(msg)

    return resp.json()


def sync_bundle(token, bundle, consider_active = False):
    """Given FHIR bundle, insert or update all contained resources

    :param token: valid JWT token for use in auth calls
    :param bundle: bundle of FHIR resources to sync

    Expecting to receive a bundle of FHIR resources from an external
    source, to be synchronized with the internal backing store, namely
    HAPI.

    :returns: synchronized resource if only one in bundle

    """
    if bundle.get("resourceType") != "Bundle":
        raise ValueError(f"Expected bundle; can't process {bundle.get('resourceType')}")

    for entry in bundle.get("entry"):
        # Restrict to what is expected for now
        if entry["resourceType"] != "Patient":
            raise ValueError(f"Can't sync resourceType {entry['resourceType']}")

        patient = sync_patient(token, entry, consider_active)
        # TODO handle multiple external matches (if it ever happens!)
        # currently returning first
        return patient


def _merge_patient(src_patient, internal_patient, token, consider_active = False):
    """Helper used to push details from src into internal patient"""
    # TODO consider additional patient attributes beyond identifiers

    def different(src, dest):
        """returns true if details of interest found to be different"""
        if src == dest:
            return False
        if src.get("identifier") is None:
            return False
        src_ids = set(
            [f"{id['system']}|{id['value']}" for id in src.get("identifier", [])]
        )
        dest_ids = set(
            [f"{id['system']}|{id['value']}" for id in dest.get("identifier", [])]
        )
        if src_ids == dest_ids:
            return False
        return True

    if not different(src_patient, internal_patient):
        # If patient is active, proceed. If not, re-activate
        if not consider_active:
            return internal_patient

        if internal_patient.get("active", False) is not False:
            return internal_patient

        params = patient_as_search_params(internal_patient)
        # Ensure it is active
        internal_patient["active"] = True
        return HAPI_request(
            token=token,
            method="PUT",
            params=params,
            resource_type="Patient",
            resource=internal_patient,
            resource_id=internal_patient["id"],
        )
    else:
        internal_patient["identifier"] = src_patient["identifier"]
        params = patient_as_search_params(internal_patient)
        # Ensure it is active, skip if active field does not exis
        if consider_active:
            internal_patient["active"] = True
        return HAPI_request(
            token=token,
            method="PUT",
            params=params,
            resource_type="Patient",
            resource=internal_patient,
            resource_id=internal_patient["id"],
        )


def patient_as_search_params(patient, active_only=False):
    """Generate HAPI search params from patient resource"""

    # Use same parameters sent to external src looking for existing Patient
    # Note FHIR uses list for 'name' and 'given', common parameter use defines just one
    if active_only:
        search_map = (
            ("name.family", "family", ""),
            ("name[0].family", "family", ""),
            ("name.given", "given", ""),
            ("name.given[0]", "given", ""),
            ("name[0].given[0]", "given", ""),
            ("birthDate", "birthdate", "eq"),
            ("active", True, "eq"),
        )
    else:
        search_map = (
        ("name.family", "family", ""),
        ("name[0].family", "family", ""),
        ("name.given", "given", ""),
        ("name.given[0]", "given", ""),
        ("name[0].given[0]", "given", ""),
        ("birthDate", "birthdate", "eq"),
        )

    search_params = {}

    for path, queryterm, compstr in search_map:
        match = json_search(path, patient)
        if match and isinstance(match, str):
            search_params[queryterm] = compstr + match
    return search_params


def internal_patient_search(token, patient, active_only=False):
    """Look up given patient from "internal" HAPI store, returns bundle"""
    params = patient_as_search_params(patient, active_only)

    return HAPI_request(
        token=token, method="GET", resource_type="Patient", params=params
    )


def new_resource_hook(resource):
    """Return modified version of resourse as per new resource rules

    Products occasionally require customization of resources on creation.
    This hook manages such, using environment to specialize.

    :returns: modified resource
    """
    if resource.get("id"):
        # not a new resource, bail
        return resource

    if resource["resourceType"] == "Patient":
        np_extensions = current_app.config.get("NEW_PATIENT_EXTENSIONS")
        if np_extensions:
            if "extension" not in resource:
                resource["extension"] = []
            resource["extension"].extend(np_extensions)
    return resource


def sync_patient(token, patient, consider_active = False):
    """Sync single patient resource - insert or update as needed"""

    internal_search = internal_patient_search(token, patient)

    # If found, return the Patient, merging if necessary
    match_count = internal_search["total"]
    if match_count > 0:
        if match_count > 1:
            current_app.logger.warning(
                f"expected ONE matching patient, found {match_count}"
            )

        internal_patient = internal_search["entry"][0]["resource"]
        merged_patient = _merge_patient(
            src_patient=patient, internal_patient=internal_patient, token=token, consider_active=consider_active,
        )
        return merged_patient

    # No match, insert and return
    patient = new_resource_hook(resource=patient)
    patient["active"] = True
    return HAPI_request(
        token=token,
        method="POST",
        resource_type="Patient",
        resource=patient,
    )


def restore_patient(token, patient):
    """Restore single internal patient resource"""
    # Set patient to active
    patient["active"] = True

    return HAPI_request(
        token=token,
        method="PUT",
        resource_type="Patient",
        resource=patient,
        resource_id=patient["id"],
    )
