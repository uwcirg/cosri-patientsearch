# Stayhome Dashboard

Dashboard presentation of Stayhome.app useage and protected resources.

All views require Keycloak authentication.  Keycloak roles determine authorization scopes.

### Setup
#
1) `git clone <this repository>`
2) `cp client_secrets.json.default client_secrets.json`  # Edit to fit
3) `cp dashboard.env.default dashboard.env`  # Edit to fit
4) `mkvirtualenv stayhome-dashboard`  # Python 3.7
5) `pip install nodeenv`
6) `nodeenv --python-virtualenv`
7) `pip install -e .`
8) `npm install .`

### Run
#
1) Run the script located in the `dashboard/bin` directory:
   * `dashboard/bin/dashboardrun.sh`

Head over to `localhost:8000`, you should see a list of patients as a Keycloak user with the `admin` role

Try `localhost:8000/Patient` as a Keycloak user with the `admin` role to see
a json list of all patients.

### Run in docker
1) `sudo docker-compose build web`
2) `sudo docker-compose up -d`

### Resources
#
* Initial structure built using [cookiecutter-react-flask](https://github.com/arberx/cookiecutter-react-flask)
