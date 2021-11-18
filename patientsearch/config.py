import json
import os
from urllib.parse import urlparse

import redis
from redis_dict import RedisDict


def load_json_config(potential_json_string):
    """Detect if given string is JSON file, or JSON string"""
    if potential_json_string.endswith('.json'):
        return potential_json_string
    elif potential_json_string:
        return json.loads(potential_json_string)


LANDING_INTRO = os.getenv("LANDING_INTRO", "")
LANDING_BUTTON_TEXT = os.getenv("LANDING_BUTTON_TEXT", "")
LANDING_BODY = os.getenv("LANDING_BODY", "")
MORE_MENU = os.getenv("MORE_MENU", "").split(',')
SERVER_NAME = os.getenv("SERVER_NAME")
SECRET_KEY = os.getenv("SECRET_KEY")
SYSTEM_TYPE = os.getenv("SYSTEM_TYPE", "development")
SITE_ID = os.getenv("SITE_ID")

SESSION_TYPE = os.getenv("SESSION_TYPE", 'filesystem')

REDIS_URL = os.environ.get('REDIS_URL')
if REDIS_URL:
    SESSION_TYPE = "redis"
    SESSION_REDIS = redis.from_url(REDIS_URL)
    parts = urlparse(REDIS_URL)
    OIDC_CREDENTIALS_STORE = RedisDict(
        namespace='oidc_store',
        host=parts.hostname,
        port=parts.port,
        db=int(parts.path[1:]))

STATIC_DIR = os.getenv("STATIC_DIR")

LOGSERVER_TOKEN = os.getenv('LOGSERVER_TOKEN')
LOGSERVER_URL = os.getenv('LOGSERVER_URL')

# NB log level hardcoded at INFO for logserver
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'DEBUG').upper()

VERSION_STRING = os.getenv("VERSION_STRING")

EXTERNAL_FHIR_API = os.getenv("EXTERNAL_FHIR_API")
MAP_API = os.getenv("MAP_API")

SOF_CLIENT_LAUNCH_URL = os.getenv("SOF_CLIENT_LAUNCH_URL")
SOF_HOST_FHIR_URL = os.getenv("SOF_HOST_FHIR_URL")

# build flask-oidc config from our own granular environment variables, if present
if os.getenv("OIDC_CLIENT_ID"):
    OIDC_CLIENT_SECRETS = {"web": {
        "auth_uri": os.environ["OIDC_AUTHORIZE_URL"],
        "client_id": os.environ["OIDC_CLIENT_ID"],
        "client_secret": os.environ["OIDC_CLIENT_SECRET"],
        "issuer": os.environ["OIDC_ISSUER"],
        "redirect_uris": os.environ["OIDC_REDIRECT_URIS"].split(","),
        "userinfo_uri": os.environ["OIDC_USERINFO_URI"],
        "token_uri": os.environ["OIDC_TOKEN_URI"],
        "token_introspection_uri": os.environ["OIDC_TOKEN_INTROSPECTION_URI"],
    }}
else:
    OIDC_CLIENT_SECRETS = load_json_config(os.getenv("OIDC_CLIENT_SECRETS", "client_secrets.json"))

OIDC_ID_TOKEN_COOKIE_SECURE = False
OIDC_REQUIRE_VERIFIED_EMAIL = False
OIDC_SCOPES = ['email', 'openid', 'roles']
UDS_LAB_TYPES = json.loads(os.getenv("UDS_LAB_TYPES", '[]'))
