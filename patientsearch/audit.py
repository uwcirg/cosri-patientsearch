"""Audit

functions to simplify adding context and extra data to log messages destined for audit logs
"""
from flask import current_app, has_app_context
import logging

from patientsearch.logserverhandler import LogServerHandler

EVENT_LOG_NAME = "cosri_patientsearch_event_logger"


def audit_log_init(app):
    log_server_handler = LogServerHandler(
        jwt=app.config["LOGSERVER_TOKEN"], url=app.config["LOGSERVER_URL"]
    )
    event_logger = logging.getLogger(EVENT_LOG_NAME)
    event_logger.setLevel(logging.INFO)
    event_logger.addHandler(log_server_handler)


def audit_entry(message, level="info", extra=None):
    """Log entry, adding in session info such as active user"""
    try:
        logger = logging.getLogger(EVENT_LOG_NAME)
        log_at_level = getattr(logger, level.lower())
    except AttributeError:
        raise ValueError(f"audit_entry given bogus level: {level}")

    if extra is None:
        extra = {}

    if has_app_context() and "version" not in extra:
        extra["version"] = current_app.config["VERSION_STRING"]
    log_at_level(message, extra=extra)


def audit_HAPI_change(
    user_info, method, params=None, resource=None, resource_type=None, resource_id=None
):
    rt = resource_type or resource and resource.get("resourceType")
    id = resource_id or resource and resource.get("_id", "")
    msg = f"{method} {rt}/{id}"
    extra = {"tags": [rt, method], "user": user_info}

    if rt == "Patient":
        extra["patient"] = {"subject.id": resource_id}
    elif resource:
        extra["resource"] = resource

    if params:
        extra["params"] = params
    audit_entry(message=msg, extra=extra)
