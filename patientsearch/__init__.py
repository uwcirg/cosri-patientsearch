from flask import Flask
from flask_session import Session
import logging
from logging import config as logging_config
import os

from fhir_migrations import commands as migration_commands
from patientsearch.api import api_blueprint
from patientsearch.audit import audit_entry, audit_log_init
from patientsearch.extensions import oidc

session = Session()


def create_app(testing=False):
    """Application factory, used to create and configure application"""
    static_dir = os.environ.get("STATIC_DIR")
    if static_dir:
        app = Flask(__name__, static_folder=static_dir)
    else:
        app = Flask(__name__)
    app.config.from_object("patientsearch.config")
    session.init_app(app)

    if testing is True:
        app.config["SECRET_KEY"] = "nonsense-testing-key"
        app.config["MAP_API"] = "http://mock-MAP-API/"
        app.config["EXTERNAL_FHIR_API"] = "http://mock-EXTERNAL-API/"
        app.config["TESTING"] = True
        app.config["OIDC_CLIENT_SECRETS"] = {
            "web": {
                "auth_uri": "https://keycloak.fake/auth/realms/cosri-launcher/protocol/openid-connect/auth",  # noqa: E501
                "client_id": "cosri-patientsearch",
                "client_secret": "unknown",
                "issuer": "https://keycloak.fake/auth/realms/cosri-launcher",
                "redirect_uris": ["http://localhost:8000/oidc_callback"],
                "userinfo_uri": "https://keycloak.fake/auth/realms/cosri-launcher/protocol/openid-connect/userinfo",  # noqa: E501
                "token_uri": "https://keycloak.fake/auth/realms/cosri-launcher/protocol/openid-connect/token",  # noqa: E501
                "token_introspection_uri": "https://keycloak.fake/auth/realms/cosri-launcher/protocol/openid-connect/token/introspect",  # noqa: E501
            }
        }

    # Confirm presence of SECRET_KEY, or nonsense errors will burn hours
    if not app.config["SECRET_KEY"]:
        raise RuntimeError("SECRET_KEY not defined; can't continue")

    configure_logging(app)
    oidc.init_app(app)
    app.register_blueprint(api_blueprint)
    app.register_blueprint(migration_commands.migration_blueprint)
    return app


def configure_logging(app):
    app.logger  # must call to initialize prior to config or it'll replace
    logging_config.fileConfig("logging.ini", disable_existing_loggers=False)

    # Overwrite logging.ini if necessary on prod, etc.
    app.logger.setLevel(getattr(logging, app.config["LOG_LEVEL"].upper()))
    app.logger.debug(
        "cosri patientsearch logging initialized",
        extra={"tags": ["testing", "logging", "app"]},
    )

    if not app.config["LOGSERVER_URL"] or not app.config["LOGSERVER_TOKEN"]:
        return

    audit_log_init(app)
    audit_entry(
        "cosri patientsearch logging initialized",
        extra={
            "tags": ["testing", "logging", "events"],
            "version": app.config["VERSION_STRING"],
        },
    )
