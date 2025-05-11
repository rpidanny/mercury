"""
Logger configuration utilities.
"""

import logging


def configure_logging(app, log_level="INFO"):
    """
    Configure logging for the Flask application.

    Args:
        app: The Flask application
        log_level: The logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(level=level)
    app.logger.setLevel(level)
