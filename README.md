# COSRI Patient Search

[![Docker Image Version (latest semver)](https://img.shields.io/docker/v/uwcirg/cosri-patientsearch?label=latest%20release&sort=semver)](https://hub.docker.com/repository/docker/uwcirg/cosri-patientsearch)

All views require Keycloak authentication.  Keycloak roles determine authorization scopes.

### Setup
#
1) `git clone <this repository>`
2) `cp client_secrets.json.default client_secrets.json`  # Edit to fit
3) `cp patientsearch.env.default patientsearch.env`  # Edit to fit
4) `mkvirtualenv patientsearch`  # Python 3.10
5) `pip install nodeenv`
6) `nodeenv --python-virtualenv`
7) `pip install -e .`
8) `npm install .`

### Run
#
1) Run the script located in the `patientsearch/bin` directory:
   * `patientsearch/bin/patientsearchrun.sh`

### Run in docker
1) `sudo docker-compose build web`
2) `sudo docker-compose up -d`

### Resources
#
* Initial structure built using [cookiecutter-react-flask](https://github.com/arberx/cookiecutter-react-flask)
