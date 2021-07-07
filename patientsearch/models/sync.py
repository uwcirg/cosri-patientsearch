"""Manages synchronization of Model data, between external and internal stores"""
from copy import deepcopy

from flask import abort, current_app
from jmespath import search as json_search
import requests
from .bearer_auth import BearerAuth


def add_identifier_to_resource_type(bundle, resource_type, identifier):
    result = deepcopy(bundle)
    for resource in result['entry']:
        if resource.get('resourceType') != resource_type:
            continue
        identifiers = resource.get('identifier', [])
        found = False
        for i in identifiers:
            if (
                    i.get('system', '') == identifier.system and
                    i.get('value', '') == identifier.value):
                found = True
                break
        if not found:
            identifiers.append(identifier)
            resource['identifier'] = identifiers
    return result


def HAPI_request(
        token, method, resource_type, resource_id=None, resource=None, params=None):
    """Execute HAPI request on configured system - return JSON

    :param token: validated JWT to include in request for auth
    :param method: HTTP verb, POST, PUT, GET, DELETE
    :param resource_type: String naming desired such as ``Patient``
    :param resource_id: Optional, used when requesting specific resource
    :param resource: FHIR resource used in PUT/POST
    :param params: Optional additional search parameters

    """
    url = f"{current_app.config.get('MAP_API')}{resource_type}"
    if resource_id is not None:
        url = '/'.join(url, resource_id)

    VERB = method.upper()
    if VERB == 'GET':
        # By default, HAPI caches search results for 60000 milliseconds,
        # meaning new patients won't immediately appear in results.
        # Disable caching until we find the need and safe use cases
        headers = {'Cache-Control': 'no-cache'}
        resp = requests.get(
            url, auth=BearerAuth(token), headers=headers, params=params)
    elif VERB == 'POST':
        resp = requests.post(url, auth=BearerAuth(token), json=resource)
    elif VERB == 'PUT':
        resp = requests.put(url, auth=BearerAuth(token), json=resource)
    elif VERB == 'DELETE':
        # Only enable deletion of resource by id
        if not resource_id:
            abort(400, "'resource_id' required for DELETE")
        resp = requests.delete(url, auth=BearerAuth(token))
    else:
        abort(400, f"Invalid HTTP method: {method}")

    try:
        resp.raise_for_status()
    except requests.exceptions.HTTPError as err:
        abort(err.response.status_code, err)
    return resp.json()


def external_request(token, resource_type, params):
    """Execute request on configured "external" system - return JSON

    :param token: validated JWT to include in request for auth
    :param resource_type: String naming desired such as ``Patient``
    :param params: Search parameters

    """
    if not resource_type:
        raise ValueError("Required `resource_type` not included")

    url = current_app.config.get('EXTERNAL_FHIR_API') + resource_type
    resp = requests.get(url, auth=BearerAuth(token), params=params)
    try:
        resp.raise_for_status()
    except requests.exceptions.HTTPError as err:
        abort(err.response.status_code, err)

    return resp.json()


def sync_bundle(token, bundle):
    """Given FHIR bundle, insert or update all contained resources

    :param token: valid JWT token for use in auth calls
    :param bundle: bundle of FHIR resources to sync

    Expecting to receive a bundle of FHIR resources from an external
    source, to be synchronized with the internal backing store, namely
    HAPI.

    :returns: synchronized resource if only one in bundle

    """
    if bundle.get('resourceType') != 'Bundle':
        raise ValueError(
            f"Expected bundle; can't process {bundle.get('resourceType')}")

    for entry in bundle.get('entry'):
        # Restrict to what is expected for now
        if entry['resourceType'] != 'Patient':
            raise ValueError(
                f"Can't sync resourceType {entry['resourceType']}")

        patient = sync_patient(token, entry)
        # TODO handle multiple external matches (if it ever happens!)
        # currently returning first
        return patient


def _merge_patient(src_patient, internal_patient, token):
    """Helper used to push details from src into internal patient"""
    # TODO consider additional patient attributes beyond identifiers

    def different(src, dest):
        """returns true if details of interest found to be different"""
        if src == dest:
            return False
        if src.get('identifier') is None:
            return False
        src_ids = set(
            [f"{id['system']}|{id['value']}" for id in src.get('identifier', [])])
        dest_ids = set(
            [f"{id['system']}|{id['value']}" for id in dest.get('identifier', [])])
        if src_ids == dest_ids:
            return False
        return True

    if not different(src_patient, internal_patient):
        return internal_patient
    else:
        internal_patient['identifier'] = src_patient['identifier']
        return HAPI_request(
            token=token, method='PUT', resource_type='Patient', resource=internal_patient)


def internal_patient_search(token, patient):
    """Look up given patient from "internal" HAPI store, returns bundle"""

    # Use same parameters sent to external src looking for existing Patient
    # Note FHIR uses list for 'given', common parameter use defines just one
    search_map = (
        ('name.family', 'family', ''),
        ('name.given', 'given', ''),
        ('name.given[0]', 'given', ''),
        ('birthDate', 'birthdate', 'eq')
    )
    search_params = {}

    for path, queryterm, compstr in search_map:
        match = json_search(path, patient)
        if match and isinstance(match, str):
            search_params[queryterm] = compstr + match

    return HAPI_request(token=token, method='GET', resource_type='Patient', params=search_params)


def sync_patient(token, patient):
    """Sync single patient resource - insert or update as needed"""

    internal_search = internal_patient_search(token, patient)

    # If found, return the Patient, merging if necessary
    match_count = internal_search['total']
    if match_count > 0:
        if match_count > 1:
            current_app.logger.warning(
                f"expected ONE matching patient, found {match_count}")

        internal_patient = internal_search['entry'][0]['resource']
        merged_patient = _merge_patient(
            src_patient=patient, internal_patient=internal_patient, token=token)
        return merged_patient

    # No match, insert and return
    return HAPI_request(
        token=token, method='POST', resource_type='Patient', resource=patient)
