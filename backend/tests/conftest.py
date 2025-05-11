import os
import pytest
import sys
import importlib
from app.config.config import Config
import os.path
import numpy as np
from app.services.elevation import ElevationService


# Important: Set up config for all tests
@pytest.fixture(autouse=True, scope="session")
def setup_test_env():
    """
    Set up the environment for all tests.
    This ensures ALOS_DSM_PATH is set to the test data file.
    """
    # Get the absolute path to the test VRT file
    base_dir = os.path.dirname(os.path.abspath(__file__))
    vrt_path = os.path.join(base_dir, "data", "everest_AW3D30.vrt")

    # Verify the file exists
    assert os.path.exists(vrt_path), f"Test VRT file not found at {vrt_path}"

    # Set the environment variable for tests
    os.environ["ALOS_DSM_PATH"] = vrt_path


@pytest.fixture
def test_data_path():
    """Return the path to the test VRT file."""
    # Get the absolute path to the VRT file
    base_dir = os.path.dirname(os.path.abspath(__file__))
    vrt_path = os.path.join(base_dir, "data", "everest_AW3D30.vrt")

    # Verify the file exists
    assert os.path.exists(vrt_path), f"Test VRT file not found at {vrt_path}"
    return vrt_path


@pytest.fixture
def test_config(test_data_path):
    """Create a Config instance for testing."""
    return Config(alos_data_path=test_data_path)


@pytest.fixture
def app(monkeypatch, test_config):
    """Create and configure a Flask app for testing."""
    # Import here to avoid circular imports
    from app.app import create_app

    # Monkey patch the app.app module to use our test config
    import app.app

    monkeypatch.setattr(app.app, "config", test_config)

    app = create_app()
    app.config.update({"TESTING": True})

    # Create and add the elevation service to the app config
    if "elevation_service" not in app.config:
        elevation_service = ElevationService(
            logger=app.logger, dsm_path=test_config.alos_data_path
        )
        app.config["elevation_service"] = elevation_service

    yield app


@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """A test CLI runner for the app."""
    return app.test_cli_runner()


# Keep mock_rasterio fixture as a no-op for backwards compatibility with existing tests
@pytest.fixture
def mock_rasterio():
    """
    This fixture no longer does any mocking as we're now directly mocking rasterio.open when needed.
    Kept for backwards compatibility with existing tests.
    """
    pass
