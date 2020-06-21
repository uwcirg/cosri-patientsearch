import json
from pytest import fixture
import os

from patientsearch.models import sync_bundle


def load_json(datadir, filename):
    with open(os.path.join(datadir, filename), 'r') as json_file:
        data = json.load(json_file)
    return data


@fixture
def external_patient_search(datadir):
    return load_json(datadir, "external_patient_search.json")


@fixture
def new_patient(datadir):
    return load_json(datadir, "new_patient_result.json")


@fixture
def internal_patient_miss(datadir):
    return load_json(datadir, "internal_patient_miss.json")


@fixture
def internal_patient_match(datadir):
    return load_json(datadir, "internal_patient_match.json")


def test_new_upsert(
        client, mocker, faux_token, external_patient_search,
        internal_patient_miss, new_patient):
    """Without finding a matching patient, should insert new and return"""

    # Mock HAPI search failing to find a matching patient
    mocker.patch(
        'patientsearch.models.sync.HAPI_request',
        return_value=internal_patient_miss)

    # Mock HAPI POST to generate new patient
    mocker.patch(
        "patientsearch.models.sync.HAPI_POST", return_value=new_patient)

    result = sync_bundle(faux_token, external_patient_search)
    assert result == new_patient


def test_existing(
        client, mocker, faux_token, external_patient_search,
        internal_patient_match, new_patient):
    """Finding a matching patient, return existing"""

    # Mock HAPI search finding a matching patient
    mocker.patch(
        'patientsearch.models.sync.HAPI_request',
        return_value=internal_patient_match)

    result = sync_bundle(faux_token, external_patient_search)
    assert result == new_patient
