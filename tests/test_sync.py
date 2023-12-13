from copy import deepcopy
import json
from pytest import fixture
import os

from patientsearch.models import add_identifier_to_resource_type, sync_bundle


def load_json(datadir, filename):
    with open(os.path.join(datadir, filename), "r") as json_file:
        data = json.load(json_file)
    return data


class mock_response:
    """Wrap data in response like object"""

    def __init__(self, data, status_code=200):
        self.data = data
        self.status_code = status_code

    def json(self):
        return self.data

    def raise_for_status(self):
        if self.status_code == 200:
            return
        raise Exception("status code ain't 200")


@fixture
def external_patient_search(datadir):
    return load_json(datadir, "external_patient_search.json")


@fixture
def external_patient_search_active(datadir):
    return load_json(datadir, "external_patient_search_active.json")


@fixture
def new_patient(datadir):
    return load_json(datadir, "new_patient_result.json")

@fixture
def new_patient_active(datadir):
    return load_json(datadir, "new_patient_result_active.json")

@fixture
def internal_patient_miss(datadir):
    return load_json(datadir, "internal_patient_miss.json")


@fixture
def internal_patient_match(datadir):
    return load_json(datadir, "internal_patient_match.json")


@fixture
def internal_patient_active_match(datadir):
    return load_json(datadir, "internal_patient_active_match.json")


@fixture
def internal_patient_inactive_match(datadir):
    return load_json(datadir, "internal_patient_inactive_match.json")


@fixture
def internal_patient_duplicate_match(datadir):
    return load_json(datadir, "internal_patient_duplicate_match.json")


@fixture
def internal_patient_duplicate_active_match(datadir):
    return load_json(datadir, "internal_patient_duplicate_active_match.json")


@fixture
def internal_patient_duplicate_inactive_match(datadir):
    return load_json(datadir, "internal_patient_duplicate_inactive_match.json")

def test_new_upsert(
    client,
    mocker,
    faux_token,
    external_patient_search,
    external_patient_search_active,
    internal_patient_miss,
    new_patient,
    new_patient_active
    ):
    """Without finding a matching patient, should insert new and return"""

    # Mock HAPI search failing to find a matching patient
    mocker.patch(
        "patientsearch.models.sync.requests.get",
        return_value=mock_response(internal_patient_miss),
    )

    # Mock POST to generate new patient on HAPI
    mocker.patch(
        "patientsearch.models.sync.requests.post",
        return_value=mock_response(new_patient),
    )

    result = sync_bundle(faux_token, external_patient_search)
    assert result == new_patient


    """Finding inactive patient, user specified to not restore, should insert new and return"""

    # Mock POST to generate new patient on HAPI
    mocker.patch(
        "patientsearch.models.sync.requests.post",
        return_value=mock_response(new_patient_active),
    )

    result = sync_bundle(faux_token, external_patient_search_active)
    assert result == new_patient_active


def test_adding_identifier(external_patient_search):
    """Test adding identifier to external search bundle"""
    ident = {"system": "https://examle.org/foobar", "value": 12}
    result = add_identifier_to_resource_type(external_patient_search, "Patient", ident)
    assert result != external_patient_search
    for entry in result["entry"]:
        assert len(entry["identifier"]) == 1
        assert entry["identifier"][0] == ident


def test_existing(
    client, 
    mocker, 
    faux_token, 
    external_patient_search, 
    external_patient_search_active,
    internal_patient_match, 
    internal_patient_active_match, 
    internal_patient_inactive_match
):
    """Finding a matching patient, return existing"""

    # Mock HAPI search finding a matching patient
    mocker.patch(
        "patientsearch.models.sync.requests.get",
        return_value=mock_response(internal_patient_match),
    )

    result = sync_bundle(faux_token, external_patient_search)
    assert result == internal_patient_match["entry"][0]["resource"]

    """Finding a matching active patient from active external search, return existing"""

    # Mock HAPI search finding a matching active patient
    mocker.patch(
        "patientsearch.models.sync.requests.get",
        return_value=mock_response(internal_patient_active_match),
    )

    result = sync_bundle(faux_token, external_patient_search_active)
    assert result == internal_patient_active_match["entry"][0]["resource"]

    """Finding a matching inactive patient from active external search, return existing restored/new"""

    # Mock HAPI search finding a matching inactive patient 
    # when the service is called to create to be restored
    mocker.patch(
        "patientsearch.models.sync.requests.get",
        return_value=mock_response(internal_patient_inactive_match),
    )

    result = sync_bundle(faux_token, external_patient_search_active)
    assert result == internal_patient_inactive_match["entry"][0]["resource"]




def test_existing_modified(
    client,
    mocker, 
    faux_token, 
    external_patient_search, 
    internal_patient_match
):
    """Confirm modified external details get synchronized"""

    # Mock HAPI search finding a matching patient (w/o the identifier)
    assert "identifier" not in internal_patient_match["entry"][0]["resource"]
    mocker.patch(
        "patientsearch.models.sync.requests.get",
        return_value=mock_response(internal_patient_match),
    )

    # Mock adding the identifier on a successful PDMP search
    found_identifier = {"system": "http://example.hapi.service", "value": "found"}
    external_patient_search_w_identifier = add_identifier_to_resource_type(
        bundle=external_patient_search,
        resource_type="Patient",
        identifier=found_identifier,
    )

    # Mock HAPI search pushing the identified patient (via PUT call to HAPI)
    identified_internal = deepcopy(internal_patient_match["entry"][0]["resource"])
    identified_internal["identifier"] = [found_identifier]
    mocker.patch(
        "patientsearch.models.sync.requests.put",
        return_value=mock_response(identified_internal),
    )

    # Confirm we get back the identified/patched patient from the PUT
    result = sync_bundle(faux_token, external_patient_search_w_identifier)
    assert result == identified_internal
    assert result["identifier"] == [found_identifier]


def test_duplicate(
    client,
    mocker,
    faux_token,
    external_patient_search,
    external_patient_search_active,
    internal_patient_duplicate_match,
    internal_patient_duplicate_active_match,
    internal_patient_duplicate_inactive_match
):
    """Finding a matching patient with duplicates, handle well"""

    # Mock HAPI search finding duplicate matching patients
    mocker.patch(
        "patientsearch.models.sync.requests.get",
        return_value=mock_response(internal_patient_duplicate_match),
    )

    # Shouldn't kill the process, but return the first
    result = sync_bundle(faux_token, external_patient_search)
    assert result == internal_patient_duplicate_match["entry"][0]["resource"]

    # Shouldn't kill the process, but return the first
    result = sync_bundle(faux_token, external_patient_search_active)
    assert result == internal_patient_duplicate_active_match["entry"][0]["resource"]

    # Shouldn't kill the process, but return the first, restoring/initiating new patient
    result = sync_bundle(faux_token, external_patient_search_active)
    assert result == internal_patient_duplicate_inactive_match["entry"][0]["resource"]

    # # TODO: test inactive/active configuration, should return active one?
    # result = sync_bundle(faux_token, external_patient_search_active)
    # assert result == internal_patient_duplicate_inactive_match["entry"][1]["resource"]
