
from setuptools import setup

setup(
    name="dashboard",
    version="1.0",
    packages=["dashboard"],
    include_package_data=True,
    install_requires=[
        'Flask',
        'flask-oidc',
        'requests'
    ]
)
