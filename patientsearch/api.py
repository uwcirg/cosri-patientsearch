from datetime import datetime
from flask import (
    Blueprint,
    abort,
    current_app,
    jsonify,
    redirect,
    request,
    safe_join,
    session,
    send_from_directory,
)
from flask.json import JSONEncoder
import jwt
import requests
from werkzeug.exceptions import Unauthorized

from patientsearch.models import (
    BearerAuth,
    HAPI_request,
    add_identifier_to_resource_type,
    external_request,
    internal_patient_search,
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
    session.clear()


def validate_auth():
    """Verify state of auth token, raise 401 if inadequate

    :returns: access token, if valid
    """
    try:
        token = oidc.get_access_token()
    except TypeError:
        # raised when the token isn't accessible to the oidc lib
        terminate_session()
        raise Unauthorized("oidc access token inaccessible")

    if not oidc.validate_token(token):
        terminate_session()
        raise Unauthorized(
            "Your COSRI session timed out. "
            "Please refresh your browser to enter your user name and password "
            "to log back in.")
    return token


def current_user_id(token):
    """Safe wrapper to lookup logged in user's identifier string for logging"""
    try:
        user_id = oidc.user_getfield('email')
    except Exception:
        # mystery how token was valid at entry, but no email available?
        user_id = "unknown"
    return user_id


@api_blueprint.route('/', methods=["GET"])
@oidc.require_login
def main():
    """ Main route, entry point for react. """
    validate_auth()
    ## issue with path resolution after build
    return send_from_directory(
        #todo: remove templates directory reference; index.html isn't a jinja template
        safe_join(
            current_app.config.get("STATIC_DIR") or current_app.static_folder,
            'templates'
        ),
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
        return jsonify(valid=False, access_expires_in=0, refresh_expires_in=0)

    now = datetime.now().timestamp()
    access_token  = jwt.decode(oidc.get_access_token(), options={"verify_signature": False, "verify_aud": False})
    refresh_token  = jwt.decode(oidc.get_refresh_token(), options={"verify_signature": False, "verify_aud": False})

    return jsonify(
        valid=True,
        access_expires_in=access_token['exp']-now,
        refresh_expires_in=refresh_token['exp']-now,
    )


@api_blueprint.route('/<string:resource_type>', methods=["GET"])
def resource_bundle(resource_type):
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
        token=token, method='GET', resource_type=resource_type, params=params))


@api_blueprint.route(
    '/<string:resource_type>/<int:resource_id>', methods=["DELETE"])
def delete_resource_by_id(resource_type, resource_id):
    """Delete individual resource from HAPI; return JSON result

    NB not decorated with `@oidc.require_login` as that does an implicit
    redirect.  Client should watch for 401 and redirect appropriately.
    """
    token = validate_auth()
    extra = {'tags': ['patient', 'delete'], 'user_id': current_user_id(token)}
    if resource_type == 'Patient':
        extra['subject_id'] = resource_id
    current_app.logger.info(
        "DELETE %s/%s", resource_type, resource_id,
        extra=extra)

    return jsonify(HAPI_request(
        method='DELETE', resource_type=resource_type, resource_id=resource_id, token=token))


@api_blueprint.route(
    '/<string:resource_type>/<int:resource_id>', methods=["GET"])
def resource_by_id(resource_type, resource_id):
    """Query HAPI for individual resource; return JSON FHIR Resource

    NB not decorated with `@oidc.require_login` as that does an implicit
    redirect.  Client should watch for 401 and redirect appropriately.
    """
    token = validate_auth()
    return jsonify(HAPI_request(
        method='GET', resource_type=resource_type, resource_id=resource_id, token=token))


def resource_from_args(resource_type, args):
    """Generate FHIR resource from given type and args"""
    # refactor into model as need expands
    current_app.logger.debug(f"generate {resource_type} from {args}")
    if resource_type != 'Patient':
        raise ValueError("only Patient aware ATM")

    # The birthdate includes HAPI search syntax; parse from a pattern such as:
    #   Patient.birthdate=eq1977-01-12
    splits = args.get('subject:Patient.birthdate', '').split('eq')
    if len(splits) != 2:
        err = (
            f"Unexpected `Patient.birthdate` format: "
            f"{args.get('subject:Patient.birthdate')}")
        current_app.logger.warn(err)
        raise ValueError(err)
    dob = splits[1]

    return {
        'resourceType': resource_type,
        'name': {
            'given': args.get('subject:Patient.name.given'),
            'family': args.get('subject:Patient.name.family')},
        'birthDate': dob}


@api_blueprint.route(
    '/external_search/<string:resource_type>', methods=["PUT"])
def external_search(resource_type):
    """Query external source for resource_type

    Query configured external source (EXTERNAL_FHIR_API) for resource
    such as Patient.

    The PUT method is used, as this generates side effects, namely creating
    or updating resources in local storage.

    NB not decorated with `@oidc.require_login` as that does an implicit
    redirect.  Client should watch for 401 and redirect appropriately.

    :param resource_type: The FHIR Resource type, i.e. `Patient`
    :param search criteria: Include query string arguments to include
      as additional search criteria.
      i.e. /Patient?subject:Patient.name.given=luke&subject:Patient.birthdate=eq1977-01-12

    """
    token = validate_auth()
    # Tag any matching results with identifier naming source
    external_search_bundle = add_identifier_to_resource_type(
        bundle=external_request(token, resource_type, request.args),
        resource_type=resource_type,
        identifier={
            'system': 'https://github.com/uwcirg/script-fhir-facade',
            'value': 'found'})

    if len(external_search_bundle['entry']):
        # Merge result details with internal resources
        local_fhir_patient = sync_bundle(token, external_search_bundle)
    else:
        # See if local match already exists
        patient = resource_from_args(resource_type, request.args)
        internal_bundle = internal_patient_search(token, patient)
        local_fhir_patient = None
        if internal_bundle['total'] > 0:
            local_fhir_patient = internal_bundle['entry'][0]['resource']
        if internal_bundle['total'] > 1:
            current_app.logger.warning(
                "found multiple internal matches (%s), return first",
                patient)

    user_id = current_user_id(token)
    if not local_fhir_patient:
        # Add at this time in the local store
        local_fhir_patient = HAPI_request(
            token=token, method='POST', resource_type='Patient', resource=patient)
        current_app.logger.info(
            "PDMP search failed; create new patient from search params",
            extra={
                'tags': ['search'],
                'subject_id': local_fhir_patient['id'],
                'user_id': user_id}
        )

    # TODO: handle multiple patient results
    if len(external_search_bundle['entry']) > 1:
        current_app.logger.warn('multiple patients returned from PDMP')

    if len(external_search_bundle['entry']) > 0:
        external_search_bundle['entry'][0].setdefault('id', local_fhir_patient['id'])

    current_app.logger.info(
        "patient search found match",
        extra={
            'tags': ['search'],
            'subject_id': local_fhir_patient['id'],
            'user_id': user_id}
    )
    return jsonify(external_search_bundle)


@api_blueprint.route('/logout', methods=["GET"])
def logout():
    if oidc.user_loggedin:
        user_id = current_user_id(validate_auth())
        current_app.logger.info(
            "logout on request",
            extra={'tags': ['logout'], 'user_id': user_id})
    terminate_session()
    return redirect("/")
