import jwt
import pytest
from datetime import datetime, timedelta
from patientsearch import create_app

SECRET = 'nonsense-testing-key'


@pytest.fixture()
def app():
    return create_app(testing=True)


def generate_claims(email, sub, roles):
    now = datetime.utcnow()
    in_five = now + timedelta(minutes=5)
    claims = {
        'iss': "https://keycloak.cosri-demo.cirg.washington.edu/auth/realms/cosri",
        'iat': now.timestamp(),
        'exp': in_five.timestamp(),
        'sub': sub,
        'realm_access': {'roles': roles if roles else []},
        'email': email}
    return claims


def generate_jwt(email='fake@testy.org', sub='fake-subject', roles=None):
    claims = generate_claims(email, sub, roles)
    encoded = jwt.encode(claims, SECRET, algorithm='HS256')
    return encoded.decode('utf-8')


@pytest.fixture()
def faux_token():
    return generate_jwt()
