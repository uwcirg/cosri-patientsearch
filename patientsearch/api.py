from datetime import datetime
from flask import (
    Blueprint,
    current_app,
    jsonify,
    make_response,
    request,
    safe_join,
    send_from_directory,
)
import requests
from werkzeug.exceptions import Unauthorized

from patientsearch.models import (
    BearerAuth,
    HAPI_request,
    external_request,
    sync_bundle,
)
from patientsearch.extensions import oidc


api_blueprint = Blueprint('patientsearch-api', __name__)


def terminate_session():
    """Terminate logged in session; logout without response"""
    token = oidc.user_loggedin and oidc.get_access_token()
    if token and oidc.validate_token(token):
        # Direct POST to Keycloak necessary to clear KC domain browser cookie
        logout_uri = oidc.client_secrets['userinfo_uri'].replace(
            'userinfo', 'logout')
        data = {
            'client_id': oidc.client_secrets['client_id'],
            'client_secret': oidc.client_secrets['client_secret'],
            'refresh_token': oidc.get_refresh_token()}
        requests.post(logout_uri, auth=BearerAuth(token), data=data)

    oidc.logout()  # clears local cookie only


def validate_auth():
    """Verify state of auth token, raise 401 if inadequate

    :returns: access token, if valid
    """
    try:
        token = oidc.get_access_token()
    except TypeError:
        # raised when the token isn't accessible to the oidc lib
        raise Unauthorized("missing auth token")

    if not oidc.validate_token(token):
        terminate_session()
        raise Unauthorized("invalid auth token")
    return token


@api_blueprint.route('/', methods=["GET"])
@oidc.require_login
def main(methods=["GET"]):
    """ Main route, entry point for react. """
    validate_auth()
    ## issue with path resolution after build
    return send_from_directory(
        #todo: remove templates directory reference; index.html isn't a jinja template
        safe_join(current_app.static_folder, 'templates'),
        'index.html',
        cache_timeout=-1
    )


@api_blueprint.route('/validate_token', methods=["GET"])
def validate_token():
    """API to confirm header token is still valid

    :returns: JSON with `valid` and `expires_in` (seconds) filled in
    """
    try:
        validate_auth()
    except Unauthorized:
        return jsonify(valid=False, expires_in=0)
    expires = oidc.user_getfield('exp')
    delta = expires - datetime.now().timestamp()
    return jsonify(valid=True, expires_in=delta)


@api_blueprint.route('/<string:resource_type>', methods=["GET"])
def resource_bundle(resource_type, methods=["GET"]):
    """Query HAPI for resource_type and return as JSON FHIR Bundle

    NB not decorated with `@oidc.require_login` as that does an implicit
    redirect.  Client should watch for 401 and redirect appropriately.

    :param resource_type: The FHIR Resource type, i.e. `Patient` or `CarePlan`
    :param search criteria: Include query string arguments to pass to HAPI
      as additional search criteria.  Example: /CarePlan?subject=Patient/8

    """
    token = validate_auth()
    params = {'_count': 1000}
    params.update(request.args)
    return jsonify(HAPI_request(
        token=token, resource_type=resource_type, params=params))


@api_blueprint.route(
    '/<string:resource_type>/<int:resource_id>', methods=["GET"])
def resource_by_id(resource_type, resource_id, methods=["GET"]):
    """Query HAPI for individual resource; return JSON FHIR Resource

    NB not decorated with `@oidc.require_login` as that does an implicit
    redirect.  Client should watch for 401 and redirect appropriately.
    """
    token = validate_auth()
    return jsonify(HAPI_request(resource_type, resource_id, token))


@api_blueprint.route(
    '/external_search/<string:resource_type>', methods=["GET"])
def external_search(resource_type, methods=["GET"]):
    """Query external source for resource_type

    Query configured external source (EXTERNAL_FHIR_API) for resource
    such as Patient.

    NB not decorated with `@oidc.require_login` as that does an implicit
    redirect.  Client should watch for 401 and redirect appropriately.

    :param resource_type: The FHIR Resource type, i.e. `Patient`
    :param search criteria: Include query string arguments to include
      as additional search criteria.
      i.e. /Patient?subject:Patient.name.given=luke&subject:Patient.birthdate=eq1977-01-12

    """
    token = validate_auth()
    search_bundle = external_request(token, resource_type, request.args)
    patient_id = sync_bundle(token, search_bundle)

    # TODO: communicate the HAPI patient_id for launch
    return jsonify(search_bundle)


@api_blueprint.route('/logout', methods=["GET"])
def logout(methods=["GET"]):
    terminate_session()
    message = 'Logged out.  Return to <a href="/">COSRI Patient Search</a>'
    return make_response(message)
