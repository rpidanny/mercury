"""
Logger configuration utilities.
"""

import logging


def configure_logging(app):
    """
    Configure logging for the Flask application.
    """
    logging.basicConfig(level=logging.INFO)
    app.logger.setLevel(logging.INFO)
