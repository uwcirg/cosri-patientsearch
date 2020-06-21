from flask import Flask

from patientsearch.api import api_blueprint
from patientsearch.extensions import oidc


def create_app(testing=False):
    """Application factory, used to create and configure application"""
    app = Flask(__name__)
    app.config.from_object('patientsearch.config')

    if testing is True:
        app.config['SECRET_KEY'] = 'nonsense-testing-key'
        app.config['MAP_API'] = 'http://mock-MAP-API/'
        app.config['EXTERNAL_FHIR_API'] = 'http://mock-EXTERNAL-API/'
        app.config['TESTING'] = True
        # IDE ignoring py.test working dir, uncomment for IDE debugging
        # app.config['OIDC_CLIENT_SECRETS'] = "../client_secrets.json"

    # Confirm presence of SECRET_KEY, or nonsense errors will burn hours
    if not app.config['SECRET_KEY']:
        raise RuntimeError("SECRET_KEY not defined; can't continue")

    oidc.init_app(app)
    app.register_blueprint(api_blueprint)
    return app
