"""Audit

functions to simplify adding context and extra data to log messages destined for audit logs
"""
import logging

from patientsearch.logserverhandler import LogServerHandler

EVENT_LOG_NAME = "cosri_patientsearch_event_logger"


def audit_log_init(app):
    log_server_handler = LogServerHandler(
        jwt=app.config['LOGSERVER_TOKEN'],
        url=app.config['LOGSERVER_URL'])
    event_logger = logging.getLogger(EVENT_LOG_NAME)
    event_logger.setLevel(logging.INFO)
    event_logger.addHandler(log_server_handler)


def audit_entry(message, level='info', extra=None):
    """Log entry, adding in session info such as active user"""
    try:
        logger = logging.getLogger(EVENT_LOG_NAME)
        log_at_level = getattr(logger, level.lower())
    except AttributeError:
        raise ValueError(f"audit_entry given bogus level: {level}")

    if extra is None:
        extra = {}

    log_at_level(message, extra=extra)
