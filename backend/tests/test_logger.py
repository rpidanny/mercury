import logging
from app.utils.logger import configure_logging


def test_configure_logging(app):
    """Test that the logger is properly configured."""
    # Reset logger to default
    app.logger.setLevel(logging.NOTSET)

    # Apply configuration
    configure_logging(app)

    # Check that the logger is configured at INFO level
    assert app.logger.level == logging.INFO
