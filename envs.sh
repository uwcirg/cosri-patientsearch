#! /bin/bash

. env/bin/activate

export SERVER_NAME="clone-dev.cirg.washington.edu"
export SECRET_KEY="kHva7D1ep6g97rFjxXMBP8lQroVdNU5BXAPrsHJ9jn3LlizmIP1OBGfTpAmWTe2i"
export MAP_API="https://fhir.cosri-demo.cirg.washington.edu/hapi-fhir-jpaserver/fhir/"
export EXTERNAL_FHIR_API="https://cosri-pdmp.cirg.washington.edu/v/r2/fhir/"
export SOF_CLIENT_LAUNCH_URL="https://backend.cosri-demo.cirg.washington.edu/auth/launch"
export SOF_HOST_FHIR_URL="https://fhir.cosri-demo.cirg.washington.edu/hapi-fhir-jpaserver/fhir/"
export OIDC_CLIENT_SECRETS='client_secrets.json'
export OIDC_ID_TOKEN_COOKIE_SECURE=False
export OIDC_REQUIRE_VERIFIED_EMAIL=False
#export OIDC_SCOPES=['email', 'openid', 'roles']

./patientsearch/bin/patientsearchrun.sh