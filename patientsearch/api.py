from datetime import datetime
from flask import (
    Blueprint,
    abort,
    current_app,
    jsonify,
    make_response,
    request,
    safe_join,
    send_from_directory,
)
from flask.json import JSONEncoder
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


@api_blueprint.route('/user_info', methods=["GET"])
def user_info():
    """API to retrieve user profile info"""
    validate_auth()
    try:
        user_info = oidc.user_getinfo(['name', 'email'])
    except Unauthorized:
        raise Unauthorized("Unauthorized")
    return jsonify(user_info)


@api_blueprint.route('/settings', defaults={'config_key': None})
@api_blueprint.route('/settings/<string:config_key>')
def config_settings(config_key):
    """Non-secret application settings"""

    # workaround no JSON representation for datetime.timedelta
    class CustomJSONEncoder(JSONEncoder):
        def default(self, obj):
            return str(obj)
    current_app.json_encoder = CustomJSONEncoder

    # return selective keys - not all can be be viewed by users, e.g.secret key
    blacklist = ('SECRET', 'KEY')

    if config_key:
        key = config_key.upper()
        for pattern in blacklist:
            if pattern in key:
                abort(400, f"Configuration key {key} not available")
        return jsonify({key: current_app.config.get(key)})

    config_settings = {}
    for key in current_app.config:
        matches = any(pattern for pattern in blacklist if pattern in key)
        if matches:
            continue
        config_settings[key] = current_app.config.get(key)

    return jsonify(config_settings)


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
    external_search_bundle = external_request(token, resource_type, request.args)
    local_fhir_patient = sync_bundle(token, external_search_bundle)

    # TODO: handle multiple patient results
    if len(external_search_bundle['entry']) > 1:
        current_app.logger.warn('multiple patients returned from PDMP')
    external_search_bundle['entry'][0].setdefault('id', local_fhir_patient['id'])

    # TODO: is there a PHI safe 'id' for the user (in place of email)?
    user_id = oidc.user_getfield('email')
    current_app.logger.info(
        "patient search found match",
        extra={
            'tags': ['search'],
            'subject_id': local_fhir_patient['id'],
            'user_id': user_id}
    )
    return jsonify(external_search_bundle)


@api_blueprint.route('/logout', methods=["GET"])
def logout(methods=["GET"]):
    # TODO: is there a PHI safe 'id' for the user (in place of email)?
    user_id = oidc.user_getfield('email')
    current_app.logger.info(
        "logout on request",
        extra={'tags': ['logout'], 'user_id': user_id})
    terminate_session()
    message = 'Logged out.  Return to <a href="/">COSRI Patient Search</a>'
    return make_response(message)
