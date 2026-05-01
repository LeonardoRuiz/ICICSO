"""
Logging configuration for the Semantic Terminology Engine.
"""

import logging
import os
import sys

try:
    import structlog

    STRUCTLOG_AVAILABLE = True
except ImportError:
    STRUCTLOG_AVAILABLE = False


def _add_service_context(_: object, __: str, event_dict: dict) -> dict:
    event_dict.setdefault("service_name", "semantic-terminology-engine")
    event_dict.setdefault("environment", os.getenv("NODE_ENV") or os.getenv("ENVIRONMENT") or "development")
    return event_dict


def _rename_event_to_message(_: object, __: str, event_dict: dict) -> dict:
    if "event" in event_dict and "message" not in event_dict:
        event_dict["message"] = event_dict.pop("event")
    return event_dict


def setup_logging() -> None:
    """Configure structured logging for the application."""
    if not STRUCTLOG_AVAILABLE:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            stream=sys.stdout,
        )
        return

    shared_processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        _add_service_context,
        _rename_event_to_message,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]

    if sys.stderr.isatty():
        shared_processors.append(structlog.dev.ConsoleRenderer())
    else:
        shared_processors.append(structlog.processors.JSONRenderer())

    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=logging.INFO)

    structlog.configure(
        processors=shared_processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
