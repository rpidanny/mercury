import os
import pytest
from app.app import create_app
import tempfile
import numpy as np


@pytest.fixture
def app():
    """Create and configure a Flask app for testing."""
    # Create a temporary file to use as test data
    test_data_file = tempfile.NamedTemporaryFile(suffix=".tif", delete=False)
    test_data_path = test_data_file.name
    test_data_file.close()

    # Set test configuration
    os.environ["ALOS_DSM_PATH"] = test_data_path

    app = create_app()
    app.config.update(
        {
            "TESTING": True,
        }
    )

    yield app

    # Clean up
    os.unlink(test_data_path)


@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """A test CLI runner for the app."""
    return app.test_cli_runner()


@pytest.fixture
def mock_rasterio(monkeypatch):
    """Mock rasterio for testing elevation service."""
    # Import here to avoid issues with the monkeypatching
    from rasterio.transform import Affine

    class MockRasterio:
        class MockBounds:
            def __init__(self):
                self.left = -180.0
                self.right = 180.0
                self.bottom = -90.0
                self.top = 90.0

        class MockDatasetReader:
            def __init__(self, *args, **kwargs):
                self.bounds = MockRasterio.MockBounds()
                self.nodata = -9999
                # Add a valid transform
                self.transform = Affine(0.1, 0, -180.0, 0, -0.1, 90.0)

            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

            def sample(self, coords):
                """Return an iterator of values for the given coordinates."""
                # Return an iterator instead of a list
                return iter([[100.0] for _ in coords])

            def read(self, *args, **kwargs):
                # Return a 2D array with mock elevation data
                res = kwargs.get("out_shape", (10, 10))[0]
                return np.full((res, res), 100.0)

    # Mock the extracted dependency instead of directly mocking rasterio.open
    monkeypatch.setattr(
        "app.services.elevation._get_rasterio_dataset",
        lambda path: MockRasterio.MockDatasetReader(),
    )

    # Patch the from_bounds function to return a valid window
    def mock_from_bounds(*args, **kwargs):
        # Return a valid window tuple
        return ((0, 10), (0, 10))

    monkeypatch.setattr("rasterio.windows.from_bounds", mock_from_bounds)

    # Patch the Resampling enum
    class MockResampling:
        nearest = "nearest"

    monkeypatch.setattr("rasterio.enums.Resampling", MockResampling)
