import json
import os


def decode_json_config(potential_json_string):
    """Detect if given string is JSON file, or JSON string"""
    if potential_json_string.endswith('.json'):
        return potential_json_string
    return json.loads(potential_json_string)


SERVER_NAME = os.getenv("SERVER_NAME")
SECRET_KEY = os.getenv("SECRET_KEY")
SESSION_TYPE = os.getenv("SESSION_TYPE", 'filesystem')
STATIC_DIR = os.getenv("STATIC_DIR")

VERSION_STRING = os.getenv("VERSION_STRING")

EXTERNAL_FHIR_API = os.getenv("EXTERNAL_FHIR_API")
MAP_API = os.getenv("MAP_API")

SOF_CLIENT_LAUNCH_URL = os.getenv("SOF_CLIENT_LAUNCH_URL")
SOF_HOST_FHIR_URL = os.getenv("SOF_HOST_FHIR_URL")

OIDC_CLIENT_SECRETS = decode_json_config(os.getenv("OIDC_CLIENT_SECRETS", "client_secrets.json"))
OIDC_ID_TOKEN_COOKIE_SECURE = False
OIDC_REQUIRE_VERIFIED_EMAIL = False
OIDC_SCOPES = ['email', 'openid', 'roles']
