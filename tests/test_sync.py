import json
from pytest import fixture
import os

from patientsearch.models import sync_bundle


@fixture
def external_patient_search(request):
    data_dir, _ = os.path.splitext(request.module.__file__)
    with open(os.path.join(
            data_dir, "external_patient_search.json"), 'r') as json_file:
        data = json.load(json_file)
    return data


@fixture
def new_patient(request):
    data_dir, _ = os.path.splitext(request.module.__file__)
    with open(os.path.join(
            data_dir, "new_patient_result.json"), 'r') as json_file:
        data = json.load(json_file)
    return data


@fixture
def internal_patient_miss(request):
    data_dir, _ = os.path.splitext(request.module.__file__)
    with open(os.path.join(
            data_dir, "internal_patient_miss.json"), 'r') as json_file:
        data = json.load(json_file)
    return data


@fixture
def internal_patient_match(request):
    data_dir, _ = os.path.splitext(request.module.__file__)
    with open(os.path.join(
            data_dir, "internal_patient_match.json"), 'r') as json_file:
        data = json.load(json_file)
    return data


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
