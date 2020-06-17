
from setuptools import setup

setup(
    name="patientsearch",
    version="1.0",
    packages=["patientsearch"],
    include_package_data=True,
    install_requires=[
        'Flask',
        'flask-oidc',
        'requests'
    ]
)
