import json
import os
from urllib.parse import urlparse

import redis
from redis_dict import RedisDict


def load_json_config(potential_json_string):
    """Detect if given string is JSON file, or JSON string"""
    if potential_json_string.endswith(".json"):
        return potential_json_string
    elif potential_json_string:
        return json.loads(potential_json_string)


APPLICATION_TITLE = os.getenv(
    "APPLICATION_TITLE", "Clinical Opioid Summary with Rx Integration"
)

ENABLE_INACTIVITY_TIMEOUT = (
    os.getenv("ENABLE_INACTIVITY_TIMEOUT", "true").lower() == "true"
)

ENABLE_PATIENT_DELETE = os.getenv("ENABLE_PATIENT_DELETE", "false").lower() == "true"

ENABLE_PROVIDER_FILTER = os.getenv("ENABLE_PROVIDER_FILTER", "false").lower() == "true"
FILTER_FOR_TEST_PATIENTS_LABEL = os.getenv(
    "FILTER_FOR_TEST_PATIENTS_LABEL", "Include test patients"
)
ENABLE_FILTER_FOR_TEST_PATIENTS = (
    os.getenv("ENABLE_FILTER_FOR_TEST_PATIENTS", "false").lower() == "true"
)
LAUNCH_AFTER_PATIENT_CREATION = (
    os.getenv("LAUNCH_AFTER_PATIENT_CREATION", "false").lower() == "true"
)

FORBIDDEN_TEXT = os.getenv(
    "FORBIDDEN_TEXT",
    "Your account is not authorized for access, please contact an administrator",
)

SEARCH_TITLE_TEXT = os.getenv("SEARCH_TITLE_TEXT", "Patient Search")

MY_PATIENTS_FILTER_LABEL = os.getenv("MY_PATIENTS_FILTER_LABEL", "My Patients")

DASHBOARD_COLUMNS = json.loads(
    os.getenv(
        "DASHBOARD_COLUMNS",
        json.dumps(
            [
                {
                    "label": "First Name",
                    "expr": "$.name[0].given[0]",
                },
                {
                    "label": "Last Name",
                    "expr": "$.name[0].family",
                },
                {
                    "label": "Birth Date",
                    "expr": "$.birthDate",
                },
                {
                    "label": "Last Accessed",
                    "defaultSort": "desc",
                    "expr": "$.meta.lastUpdated",
                    "dataType": "date",
                },
            ],
        ),
    )
)

FHIR_REST_EXTRA_PARAMS_LIST = json.loads(os.getenv("FHIR_REST_EXTRA_PARAMS_LIST", "[]"))
LANDING_INTRO = os.getenv("LANDING_INTRO", "")
LANDING_BUTTON_TEXT = os.getenv("LANDING_BUTTON_TEXT", "")
LANDING_BODY = os.getenv("LANDING_BODY", "")
MORE_MENU = os.getenv("MORE_MENU", "UDS,CS_Agreement").split(",")
MATOMO_SITE_ID = os.getenv("MATOMO_SITE_ID")
NEED_PATIENT_BANNER = os.getenv("NEED_PATIENT_BANNER", "false").lower() == "true"
NEW_PATIENT_EXTENSIONS = json.loads(os.getenv("NEW_PATIENT_EXTENSIONS", "[]"))
SERVER_NAME = os.getenv("SERVER_NAME")
SECRET_KEY = os.getenv("SECRET_KEY")
SYSTEM_TYPE = os.getenv("SYSTEM_TYPE", "development")
SITE_ID = os.getenv("SITE_ID")

SESSION_TYPE = os.getenv("SESSION_TYPE", "filesystem")

REDIS_URL = os.environ.get("REDIS_URL")
if REDIS_URL:
    SESSION_TYPE = "redis"
    SESSION_REDIS = redis.from_url(REDIS_URL)
    parts = urlparse(REDIS_URL)
    OIDC_CREDENTIALS_STORE = RedisDict(
        namespace="oidc_store",
        host=parts.hostname,
        port=parts.port,
        db=int(parts.path[1:]),
    )

STATIC_DIR = os.getenv("STATIC_DIR")

LOGSERVER_TOKEN = os.getenv("LOGSERVER_TOKEN")
LOGSERVER_URL = os.getenv("LOGSERVER_URL")

# NB log level hardcoded at INFO for logserver
LOG_LEVEL = os.environ.get("LOG_LEVEL", "DEBUG").upper()

VERSION_STRING = os.getenv("VERSION_STRING")

EXTERNAL_FHIR_API = os.getenv("EXTERNAL_FHIR_API", "")
MAP_API = os.getenv("MAP_API")
SOF_HOST_FHIR_URL = os.getenv("SOF_HOST_FHIR_URL")
SOF_CLIENTS = json.loads(os.getenv("SOF_CLIENTS", "[]"))

# build flask-oidc config from our own granular environment variables, if present
if os.getenv("OIDC_CLIENT_ID"):
    OIDC_CLIENT_SECRETS = {
        "web": {
            "auth_uri": os.environ["OIDC_AUTHORIZE_URL"],
            "client_id": os.environ["OIDC_CLIENT_ID"],
            "client_secret": os.environ["OIDC_CLIENT_SECRET"],
            "issuer": os.environ["OIDC_ISSUER"],
            "redirect_uris": os.environ["OIDC_REDIRECT_URIS"].split(","),
            "userinfo_uri": os.environ["OIDC_USERINFO_URI"],
            "token_uri": os.environ["OIDC_TOKEN_URI"],
            "token_introspection_uri": os.environ["OIDC_TOKEN_INTROSPECTION_URI"],
        }
    }
else:
    OIDC_CLIENT_SECRETS = load_json_config(
        os.getenv("OIDC_CLIENT_SECRETS", "client_secrets.json")
    )

OIDC_ID_TOKEN_COOKIE_SECURE = False
OIDC_REQUIRE_VERIFIED_EMAIL = False
OIDC_SCOPES = ["email", "openid", "roles"]
PROJECT_NAME = os.getenv("PROJECT_NAME", "COSRI")
REQUIRED_ROLES = json.loads(os.getenv("REQUIRED_ROLES", "[]"))
UDS_LAB_TYPES = json.loads(os.getenv("UDS_LAB_TYPES", "[]"))
ACTIVE_PATIENT_FLAG = os.getenv("ACTIVE_PATIENT_FLAG", "false").lower() == "true"
REACTIVATE_PATIENT = os.getenv("REACTIVATE_PATIENT", "false").lower() == "true"
ONLY_CREATE_PATIENT_IF_FOUND_EXTERNAL = (
    os.getenv("ONLY_CREATE_PATIENT_IF_FOUND_EXTERNAL", "false").lower() == "true"
)
