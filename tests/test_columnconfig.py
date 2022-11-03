from datetime import datetime
import jmespath
import json
import os

from pytest import fixture


def load_json(datadir, filename):
    with open(os.path.join(datadir, filename), "r") as json_file:
        data = json.load(json_file)
    return data


@fixture
def patient_bundle(datadir):
    return load_json(datadir, "patient_bundle.json")


def test_id_count(patient_bundle):
    assert patient_bundle['total'] == 7
    expr = jmespath.compile("entry[?resource.resourceType=='Patient'].resource.id")
    results = expr.search(patient_bundle)
    assert len(results) == 7


def test_max_authored_by_patient(patient_bundle):
    results = {}
    date_format = "%Y-%m-%d"

    expr = jmespath.compile("entry[?resource.resourceType=='Patient'].resource.id")
    patient_ids = expr.search(patient_bundle)

    for id in patient_ids:
        # from each patient ID, obtain the list of QuestionnaireResponse.authored values
        expr = jmespath.compile(f"entry[?resource.subject.reference=='Patient/{id}'].resource.authored")

        # create a list of sortable datetime objects from authored date strings
        auth_dates = [datetime.strptime(a, date_format) for a in expr.search(patient_bundle)]
        auth_dates.sort()

        # retain string form for max found for patient, or empty string
        results[id] = datetime.strftime(auth_dates[-1], date_format) if auth_dates else ""

    # Confirm a few known
    assert len(results) == 7
    assert results['53'] == "2022-11-02"
    assert results['test-patient-1'] == ""
    assert results['test-patient-2'] == "2022-11-02"
