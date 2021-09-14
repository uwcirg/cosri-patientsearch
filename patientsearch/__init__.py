from flask import Flask
from flask_session import Session
import logging
from logging import config as logging_config
import os

from patientsearch.api import api_blueprint
from patientsearch.extensions import oidc
from patientsearch.logserverhandler import LogServerHandler

session = Session()


def create_app(testing=False):
    """Application factory, used to create and configure application"""
    static_dir = os.environ.get("STATIC_DIR")
    if static_dir:
        app = Flask(__name__, static_folder=static_dir)
    else:
        app = Flask(__name__)
    app.config.from_object('patientsearch.config')
    session.init_app(app)

    if testing is True:
        app.config['SECRET_KEY'] = 'nonsense-testing-key'
        app.config['MAP_API'] = 'http://mock-MAP-API/'
        app.config['EXTERNAL_FHIR_API'] = 'http://mock-EXTERNAL-API/'
        app.config['TESTING'] = True
        app.config['OIDC_CLIENT_SECRETS'] = {
            "web": {
                "auth_uri": "https://keycloak.fake/auth/realms/cosri-launcher/protocol/openid-connect/auth",
                "client_id": "cosri-patientsearch",
                "client_secret": "unknown",
                "issuer": "https://keycloak.fake/auth/realms/cosri-launcher",
                "redirect_uris": ["http://localhost:8000/oidc_callback"],
                "userinfo_uri": "https://keycloak.fake/auth/realms/cosri-launcher/protocol/openid-connect/userinfo",
                "token_uri": "https://keycloak.fake/auth/realms/cosri-launcher/protocol/openid-connect/token",
                "token_introspection_uri": "https://keycloak.fake/auth/realms/cosri-launcher/protocol/openid-connect/token/introspect"
            }
        }

    # Confirm presence of SECRET_KEY, or nonsense errors will burn hours
    if not app.config['SECRET_KEY']:
        raise RuntimeError("SECRET_KEY not defined; can't continue")

    configure_logging(app)
    oidc.init_app(app)
    app.register_blueprint(api_blueprint)
    return app


def configure_logging(app):
    app.logger  # must call to initialize prior to config or it'll replace
    logging_config.fileConfig('logging.ini', disable_existing_loggers=False)

    # Overwrite logging.ini if necessary on prod, etc.
    app.logger.setLevel(getattr(logging, app.config['LOG_LEVEL'].upper()))

    if not app.config['LOGSERVER_URL']:
        return

    log_server_handler = LogServerHandler(
        jwt=app.config['LOGSERVER_TOKEN'],
        url=app.config['LOGSERVER_URL'])

    event_logger = logging.getLogger("event_logger")
    event_logger.setLevel(logging.INFO)
    event_logger.addHandler(log_server_handler)

    app.logger.debug(
        "cosri patientsearch logging initialized",
        extra={'tags': ['testing', 'logging', 'app']})
    event_logger.info(
        "cosri patientsearch logging initialized",
        extra={'tags': ['testing', 'logging', 'events']})
