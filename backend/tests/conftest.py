import os
import pytest
from app.app import create_app
import os.path
import numpy as np


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
def app(test_data_path):
    """Create and configure a Flask app for testing."""
    # Set test configuration to use the VRT file
    os.environ["ALOS_DSM_PATH"] = test_data_path

    app = create_app()
    app.config.update(
        {
            "TESTING": True,
        }
    )

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
