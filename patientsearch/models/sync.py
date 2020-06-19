"""Manages synchronization of Model data, between external and internal stores"""
from flask import abort, current_app
from jmespath import search
import requests
from .bearer_auth import BearerAuth


def HAPI_request(token, resource_type, resource_id=None, params=None):
    """Execute HAPI request on configured system - return JSON

    :param token: validated JWT to include in request for auth
    :param resource_type: String naming desired such as ``Patient``
    :param resource_id: Optional, used when requesting specific resource
    :param params: Optional additional search parameters

    """
    url = f"{current_app.config.get('MAP_API')}{resource_type}"
    if resource_id is not None:
        url = '/'.join(url, resource_id)

    resp = requests.get(url, auth=BearerAuth(token), params=params)
    try:
        resp.raise_for_status()
    except requests.exceptions.HTTPError as err:
        abort(err.response.status_code, err)
    return resp.json()


def HAPI_POST(token, resource):
    """POST to HAPI on configured system - return JSON

    :param token: validated JWT to include in request for auth
    :param resource: FHIR resource to POST
    :returns: result returned from HAPI

    """
    resource_type = resource['resourceType']
    url = f"{current_app.config.get('MAP_API')}{resource_type}"

    resp = requests.post(url, auth=BearerAuth(token), json=resource)
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
    source, to be syncronized with the internal backing store, namely
    HAPI.

    :returns: synchronized resource if only one in bundle

    """
    assert bundle.get('resourceType') == 'Bundle'

    for entry in bundle.get('entry'):
        # Restrict to what is expected for now
        if entry['resourceType'] != 'Patient':
            raise ValueError(
                f"Can't sync resourceType {entry['resourceType']}")

        patient = sync_patient(token, entry)
        # TODO handle multiple external matches (if it ever happens!)
        # currently returning first
        return patient


def sync_patient(token, patient):
    """Sync single patient resource - insert or update as needed"""
    args = {}

    # Use same parameters sent to external src looking for existing Patient
    family = search('name.family', patient)
    if family:
        args['family'] = family
    given = search('name.given', patient)
    if given:
        args['given'] = given
    dob = search('birthDate', patient)
    if dob:
        # HAPI requires lowercase birhtdate despite the camelCase in FHIR
        args['birthdate'] = "eq" + dob

    internal_search = HAPI_request(
        token=token, resource_type='Patient', params=args)

    # If found, return the Patient
    if internal_search['total'] > 0:
        # TODO: manage sync issues when both exist and multiple matches
        return internal_search['entry'][0]['resource']

    # No match, insert and return
    return HAPI_POST(token, patient)
