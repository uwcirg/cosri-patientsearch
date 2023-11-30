from datetime import datetime
from flask import (
    Blueprint,
    current_app,
    jsonify,
    make_response,
    redirect,
    request,
    safe_join,
    session,
    send_from_directory,
)
from flask.json import JSONEncoder
import jwt
import requests
from werkzeug.exceptions import Unauthorized, Forbidden

from patientsearch.audit import audit_entry, audit_HAPI_change
from patientsearch.models import (
    BearerAuth,
    HAPI_request,
    add_identifier_to_resource_type,
    external_request,
    internal_patient_search,
    new_resource_hook,
    sync_bundle,
    restore_patient
)
from patientsearch.extensions import oidc
from patientsearch.jsonify_abort import jsonify_abort

api_blueprint = Blueprint("patientsearch-api", __name__)


@api_blueprint.route("/clear_session", methods=["GET"])
def refresh_session():
    """Clear flask_oidc session
    The next request to a protected endpoint will generate a new token, or require logging into IDP
    """

    # clears local cookie only
    oidc.logout()
    return redirect("/home")


def terminate_session():
    """Terminate logged in session; logout without response"""
    token = oidc.user_loggedin and oidc.get_access_token()
    if token and oidc.validate_token(token):
        # Direct POST to Keycloak necessary to clear KC domain browser cookie
        logout_uri = oidc.client_secrets["userinfo_uri"].replace("userinfo", "logout")
        data = {
            "client_id": oidc.client_secrets["client_id"],
            "client_secret": oidc.client_secrets["client_secret"],
            "refresh_token": oidc.get_refresh_token(),
        }
        requests.post(logout_uri, auth=BearerAuth(token), data=data, timeout=30)

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
        raise Unauthorized("oidc access token inaccessible")

    if not oidc.validate_token(token):
        raise Unauthorized(
            "Your COSRI session timed out. "
            "Please refresh your browser to enter your user name and password "
            "to log back in."
        )

    # Enforce role requirement if set in application config
    required = current_app.config.get("REQUIRED_ROLES", [])
    if not required:
        return token

    dict_token = jwt.decode(
        token,
        options={"verify_signature": False, "verify_aud": False},
    )
    user_has = dict_token.get("realm_access", {}).get("roles", [])
    if set(required).intersection(set(user_has)):
        return token

    current_app.logger.warn(
        f"User's roles: {user_has}  don't include any from REQUIRED_ROLES: {required}"
    )
    raise Forbidden("User lacks adequate 'role'; can't continue")


def current_user_info(token):
    """Safe wrapper to lookup logged in user's info for DEA and logging"""
    try:
        username = oidc.user_getfield("preferred_username")
    except Exception:
        # mystery how token was valid at entry and now inaccessible
        username = "unknown"
    try:
        DEA = oidc.user_getfield("DEA")
    except Exception:
        DEA = "unknown"
    return {"username": username, "DEA": DEA}


@api_blueprint.route("/home", methods=["GET"])
@oidc.require_login
def home():
    """Main route, entry point for react.  Requires authorized user"""
    # issue with path resolution after build
    return send_from_directory(
        # TODO remove templates directory reference; index.html isn't a jinja template
        safe_join(
            current_app.config.get("STATIC_DIR") or current_app.static_folder,
            "templates",
        ),
        "index.html",
        cache_timeout=-1,
    )


@api_blueprint.route("/user_info", methods=["GET"])
def user_info():
    """API to retrieve user profile info"""
    validate_auth()
    try:
        user_info = oidc.user_getinfo(["name", "email"])
    except Unauthorized:
        return jsonify_abort(status_code=401, message="Unauthorized")
    return jsonify(user_info)


@api_blueprint.route("/settings", defaults={"config_key": None})
@api_blueprint.route("/settings/<string:config_key>")
def config_settings(config_key):
    """Non-secret application settings"""

    # workaround no JSON representation for datetime.timedelta
    class CustomJSONEncoder(JSONEncoder):
        def default(self, obj):
            return str(obj)

    current_app.json_encoder = CustomJSONEncoder

    # return selective keys - not all can be be viewed by users, e.g.secret key
    blacklist = ("SECRET", "KEY", "TOKEN", "CREDENTIALS")

    if config_key:
        key = config_key.upper()
        for pattern in blacklist:
            if pattern in key:
                jsonify_abort(
                    status_code=400, messag=f"Configuration key {key} not available"
                )
        return jsonify({key: current_app.config.get(key)})

    config_settings = {}
    for key in current_app.config:
        matches = any(pattern for pattern in blacklist if pattern in key)
        if matches:
            continue
        config_settings[key] = current_app.config.get(key)

    return jsonify(config_settings)


@api_blueprint.route("/validate_token", methods=["GET"])
def validate_token():
    """API to confirm header token is still valid

    :returns: JSON with `valid` and `expires_in` (seconds) filled in
    """
    try:
        validate_auth()
    except Unauthorized:
        return jsonify(valid=False, access_expires_in=0, refresh_expires_in=0)

    now = datetime.now().timestamp()
    access_token = jwt.decode(
        oidc.get_access_token(),
        options={"verify_signature": False, "verify_aud": False},
    )
    refresh_token = jwt.decode(
        oidc.get_refresh_token(),
        options={"verify_signature": False, "verify_aud": False},
    )

    return jsonify(
        valid=True,
        access_expires_in=access_token["exp"] - now,
        refresh_expires_in=refresh_token["exp"] - now,
        access_token=access_token,
    )


@api_blueprint.route("/favicon.ico")
def favicon():
    favicon = "_".join((current_app.config.get("PROJECT_NAME"), "favicon.ico"))
    return send_from_directory(
        current_app.config.get("STATIC_DIR") or current_app.static_folder,
        favicon,
        mimetype="image/vnd.microsoft.icon",
    )


@api_blueprint.route("/fhir", methods=["GET"])
def bundle_getpages():
    """Base Query HAPI, typically used for paging w/o naming resource type

    NB not decorated with `@oidc.require_login` as that does an implicit
    redirect.  Client should watch for 401 and redirect appropriately.

    :param search criteria: Include query string arguments to pass to HAPI
      as additional search criteria.  Example: /fhir?_getpages=<abc>&...

    """
    token = validate_auth()
    try:
        return jsonify(HAPI_request(token=token, method="GET", params=request.args))
    except (RuntimeError, ValueError) as error:
        return jsonify_abort(status_code=400, message=str(error))


@api_blueprint.route("/fhir/<string:resource_type>", methods=["GET"])
def resource_bundle(resource_type):
    """Query HAPI for resource_type and return as JSON FHIR Bundle

    NB not decorated with `@oidc.require_login` as that does an implicit
    redirect.  Client should watch for 401 and redirect appropriately.

    :param resource_type: The FHIR Resource type, i.e. `Patient` or `CarePlan`
    :param search criteria: Include query string arguments to pass to HAPI
      as additional search criteria.  Example: /CarePlan?subject=Patient/8

    """
    token = validate_auth()
    try:
        return jsonify(
            HAPI_request(
                token=token,
                method="GET",
                resource_type=resource_type,
                params=request.args,
            )
        )
    except (RuntimeError, ValueError) as error:
        return jsonify_abort(status_code=400, message=str(error))


@api_blueprint.route("/fhir/<string:resource_type>", methods=["POST", "PUT"])
def post_resource(resource_type):
    """Delegate request to PUT/POST given resource in post body to HAPI

    NB not decorated with `@oidc.require_login` as that does an implicit
    redirect.  Client should watch for 401 and redirect appropriately.

    :param resource_type: The FHIR Resource type, i.e. `Patient` or `CarePlan`
    :param request.body: Must include the valid JSON FHIR Resource

    """
    token = validate_auth()
    try:
        resource = request.get_json()
        if not resource:
            raise ValueError("missing FHIR Resource in JSON format")
        if resource["resourceType"] != resource_type:
            raise ValueError(
                "type mismatch - POSTed resource type "
                f"{resource['resourceType']} != {resource_type}"
            )

        resource = new_resource_hook(resource)
        method = request.method
        params = request.args
        # params["active"] = True
        audit_HAPI_change(
            user_info=current_user_info(token),
            method=method,
            params=params,
            resource=resource,
            resource_type=resource_type,
        )
        return jsonify(
            HAPI_request(
                token=token,
                method=method,
                params=params,
                resource_type=resource_type,
                resource=resource,
            )
        )
    except (RuntimeError, ValueError) as error:
        return jsonify_abort(status_code=400, message=str(error))


@api_blueprint.route(
    "/fhir/<string:resource_type>/<string:resource_id>", methods=["PUT"]
)
def update_resource_by_id(resource_type, resource_id):
    """Update individual resource within HAPI; return JSON result

    Common use-case: call on PMP launch, so the referenced Patient
    gets a fresh lastUpdated value.

    NB not decorated with `@oidc.require_login` as that does an implicit
    redirect.  Client should watch for 401 and redirect appropriately.
    """
    token = validate_auth()

    try:
        resource = request.get_json()
        if not resource:
            return jsonify_abort(
                status_code=400,
                message=f"Can't PUT {resource_type}/{resource_id}"
                "without resource in `body`",
            )

        ignorable_id_increment_audit = False
        if resource_type == "Patient":
            # Increment a count identifier to force update - lastUpdated only moves on changed data
            identifiers = resource.get("identifier", [])
            count = 1
            system = "https://github.com/uwcirg/cosri-patientsearch/counter"
            for ident in identifiers:
                if ident["system"] == system:
                    count = int(ident["value"]) + 1
                    ident["value"] = count
                    break
            if count == 1:
                identifiers.append({"system": system, "value": count})
            else:
                ignorable_id_increment_audit = True
            resource["identifier"] = identifiers

        method = "PUT"
        if not ignorable_id_increment_audit:
            audit_HAPI_change(
                user_info=current_user_info(token),
                method=method,
                resource=resource,
                resource_type=resource_type,
                resource_id=resource_id,
            )
        return jsonify(
            HAPI_request(
                method=method,
                resource_type=resource_type,
                resource_id=resource_id,
                resource=resource,
                token=token,
            )
        )
    except (RuntimeError, ValueError) as error:
        return jsonify_abort(status_code=400, message=str(error))


@api_blueprint.route(
    "/fhir/<string:resource_type>/<string:resource_id>", methods=["DELETE"]
)
def delete_resource_by_id(resource_type, resource_id):
    """Delete individual resource from HAPI; return JSON result

    NB not decorated with `@oidc.require_login` as that does an implicit
    redirect.  Client should watch for 401 and redirect appropriately.
    """
    token = validate_auth()
    method = "DELETE"
    audit_HAPI_change(
        user_info=current_user_info(token),
        method=method,
        resource_type=resource_type,
        resource_id=resource_id,
    )

    try:
        return jsonify(
            HAPI_request(
                method=method,
                resource_type=resource_type,
                resource_id=resource_id,
                token=token,
            )
        )
    except (RuntimeError, ValueError) as error:
        return jsonify_abort(status_code=400, message=str(error))


@api_blueprint.route(
    "/fhir/<string:resource_type>/<string:resource_id>", methods=["GET"]
)
def resource_by_id(resource_type, resource_id):
    """Query HAPI for individual resource; return JSON FHIR Resource

    NB not decorated with `@oidc.require_login` as that does an implicit
    redirect.  Client should watch for 401 and redirect appropriately.
    """
    token = validate_auth()
    try:
        return jsonify(
            HAPI_request(
                method="GET",
                resource_type=resource_type,
                resource_id=resource_id,
                token=token,
            )
        )
    except (RuntimeError, ValueError) as error:
        return jsonify_abort(status_code=400, message=str(error))


def resource_from_args(resource_type, args):
    """Generate FHIR resource from given type and args"""
    # refactor into model as need expands
    current_app.logger.debug(f"generate {resource_type} from {args}")
    if resource_type != "Patient":
        raise ValueError("only Patient aware ATM")

    # The birthdate includes HAPI search syntax; parse from a pattern such as:
    #   Patient.birthdate=eq1977-01-12
    splits = args.get("subject:Patient.birthdate", "").split("eq")
    if len(splits) != 2:
        err = (
            f"Unexpected `Patient.birthdate` format: "
            f"{args.get('subject:Patient.birthdate')}"
        )
        current_app.logger.warn(err)
        raise ValueError(err)
    dob = splits[1]

    return {
        "resourceType": resource_type,
        "name": {
            "given": args.get("subject:Patient.name.given"),
            "family": args.get("subject:Patient.name.family"),
        },
        "birthDate": dob,
    }


@api_blueprint.route("/external_search/<string:resource_type>", methods=["PUT"])
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

    reinstate_patient = False
    # Tag any matching results with identifier naming source
    try:
        external_search_bundle = add_identifier_to_resource_type(
            bundle=external_request(token, resource_type, request.args),
            resource_type=resource_type,
            identifier={
                "system": "https://github.com/uwcirg/script-fhir-facade",
                "value": "found",
            },
        )
    except (RuntimeError, ValueError) as error:
        return jsonify_abort(status_code=400, message=str(error))

    external_match_count = (
        len(external_search_bundle["entry"])
        if ("entry" in external_search_bundle)
        else 0
    )

    extra = {
        "tags": ["search"],
        "patient": dict(request.args.copy()),
        "user": current_user_info(token),
    }

    if external_match_count:
        # Merge result details with internal resources
        try:
            local_fhir_patient = sync_bundle(token, external_search_bundle)
        except ValueError:
            return jsonify_abort(message="Error in local sync", status_code=400)
        if local_fhir_patient:
            extra["patient"]["subject.id"] = local_fhir_patient["id"]
    else:
        # See if local match already exists
        patient = resource_from_args(resource_type, request.args)
        try:
            internal_bundle = internal_patient_search(token, patient, not reinstate_patient)
        except (RuntimeError, ValueError) as error:
            return jsonify_abort(status_code=400, message=str(error))
        local_fhir_patient = None
        if internal_bundle["total"] > 0:
            local_fhir_patient = internal_bundle["entry"][0]["resource"]
            if reinstate_patient:
                local_fhir_patient = restore_patient(token, local_fhir_patient)

        if internal_bundle["total"] > 1:
            audit_entry(
                f"found multiple internal matches ({patient}), return first",
                extra=extra,
                level="warn",
            )

    if not local_fhir_patient:
        # Add at this time in the local (HAPI) store
        try:
            patient = new_resource_hook(patient)
            method = "POST"
            resource_type = "Patient"
            audit_HAPI_change(
                user_info=current_user_info(token),
                method=method,
                resource_type=resource_type,
                resource=patient,
            )
            local_fhir_patient = HAPI_request(
                token=token, method=method, resource_type="Patient", resource=patient, params={
            "active": True
            })
        except (RuntimeError, ValueError) as error:
            return jsonify_abort(status_code=400, message=str(error))
        audit_entry(
            "PDMP search failed; create new patient from search params", extra=extra
        )

    # TODO: handle multiple patient results
    if external_match_count > 1:
        audit_entry("multiple patients returned from PDMP", extra=extra, level="warn")

    if external_match_count:
        external_search_bundle["entry"][0].setdefault("id", local_fhir_patient["id"])

    message = "PDMP found match" if external_match_count else "fEMR found match"
    audit_entry(message, extra=extra)
    return jsonify(external_search_bundle)


@api_blueprint.route("/logout", methods=["GET"])
def logout():
    token = oidc.user_loggedin and oidc.get_access_token()
    if token:
        tags = ["logout"]
        for k in request.args.keys():
            tags.append(k)  # pick-up tags like `user-initiated` and `timed-out`
        audit_entry(
            "logout on request", extra={"tags": tags, "user": current_user_info(token)}
        )
    terminate_session()

    # Shouldn't be present, but just in case, manually clear the oidc cookie
    resp = make_response(
        send_from_directory(
            safe_join(
                current_app.config.get("STATIC_DIR") or current_app.static_folder,
                "templates",
            ),
            "logout.html",
            cache_timeout=-1,
        )
    )
    resp.set_cookie(
        "oidc_id_token", "", expires=0, httponly=True, secure=True, samesite="Strict"
    )
    return resp


@api_blueprint.route("/", methods=["GET"])
def main():
    """entry point for pre-authenticated access, aka `landing`"""
    try:
        token = oidc.user_loggedin and oidc.get_access_token()
        if token and oidc.validate_token(token):
            extra = {
                "tags": ["landing", "authorized"],
                "user": current_user_info(token),
            }
            audit_entry("request to landing by authenticated user", extra=extra)
            return redirect("/home")
    except Exception as ex:
        # Naked except to prevent any strange logged in token access errors from
        # generating the landing page.
        current_app.logger.exception(ex)

    return send_from_directory(
        safe_join(
            current_app.config.get("STATIC_DIR") or current_app.static_folder,
            "templates",
        ),
        "home.html",
        cache_timeout=-1,
    )


@api_blueprint.route("/target", methods=["GET"])
@oidc.require_login
def target():
    return send_from_directory(
        safe_join(
            current_app.config.get("STATIC_DIR") or current_app.static_folder,
            "templates",
        ),
        "targetLaunch.html",
        cache_timeout=-1,
    )
