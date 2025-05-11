import pytest
from app.services.elevation import (
    get_elevation_from_alos,
    get_elevation_grid,
    _get_rasterio_dataset,
)
from unittest.mock import patch


def test_get_elevation_from_alos(app, mock_rasterio):
    """Test getting elevation for a single point."""
    with app.app_context():
        # Test with valid coordinates
        elevation = get_elevation_from_alos(35.6895, 139.6917)
        assert elevation == 100.0  # Our mock value


def test_get_elevation_grid(app, mock_rasterio):
    """Test getting elevation for a grid of points."""
    with app.app_context():
        lat_vals = [35.0, 35.1, 35.2, 35.3, 35.4]
        lon_vals = [139.0, 139.1, 139.2, 139.3, 139.4]
        res = 5

        results, width, height = get_elevation_grid(lat_vals, lon_vals, res)

        # Check dimensions
        assert width == res
        assert height == res
        assert len(results) == res * res

        # Check values
        for result in results:
            assert "latitude" in result
            assert "longitude" in result
            assert "elevation" in result
            assert result["elevation"] == 100.0  # Our mock value


def test_get_elevation_from_alos_error_handling(app, monkeypatch):
    """Test error handling in get_elevation_from_alos."""
    with app.app_context():
        # Mock the extracted dependency to raise an exception
        def mock_dataset_error(*args):
            raise Exception("Test exception")

        monkeypatch.setattr(
            "app.services.elevation._get_rasterio_dataset", mock_dataset_error
        )

        # Function should return None on error
        elevation = get_elevation_from_alos(35.6895, 139.6917)
        assert elevation is None


def test_get_elevation_grid_error_handling(app, monkeypatch):
    """Test error handling in get_elevation_grid."""
    with app.app_context():
        # Mock the extracted dependency to raise an exception
        def mock_dataset_error(*args):
            raise Exception("Test exception")

        monkeypatch.setattr(
            "app.services.elevation._get_rasterio_dataset", mock_dataset_error
        )

        lat_vals = [35.0, 35.1, 35.2, 35.3, 35.4]
        lon_vals = [139.0, 139.1, 139.2, 139.3, 139.4]
        res = 5

        # Function should re-raise the exception
        with pytest.raises(Exception):
            get_elevation_grid(lat_vals, lon_vals, res)


def test_get_elevation_from_alos_out_of_bounds(app, mock_rasterio, monkeypatch):
    """Test getting elevation for a point outside the raster bounds."""
    with app.app_context():
        # Mock the bounds check to return False
        class MockDatasetReader:
            def __init__(self, *args, **kwargs):
                from rasterio.transform import Affine

                self.bounds = type(
                    "obj", (object,), {"left": 0, "right": 10, "bottom": 0, "top": 10}
                )
                self.nodata = -9999
                self.transform = Affine(0.1, 0, 0, 0, -0.1, 10)

            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

            def sample(self, coords):
                return iter([[100.0] for _ in coords])

        monkeypatch.setattr(
            "app.services.elevation._get_rasterio_dataset",
            lambda path: MockDatasetReader(),
        )

        # Test with coordinates outside bounds
        elevation = get_elevation_from_alos(-10, -10)  # Outside of 0-10 bounds
        assert elevation is None


def test_get_elevation_from_alos_nodata(app, mock_rasterio, monkeypatch):
    """Test getting elevation for a point with nodata value."""
    with app.app_context():
        # Mock to return nodata value
        class MockDatasetReader:
            def __init__(self, *args, **kwargs):
                from rasterio.transform import Affine

                self.bounds = type(
                    "obj",
                    (object,),
                    {"left": -180, "right": 180, "bottom": -90, "top": 90},
                )
                self.nodata = -9999
                self.transform = Affine(0.1, 0, -180, 0, -0.1, 90)

            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

            def sample(self, coords):
                return iter([[-9999] for _ in coords])  # Return nodata value

        monkeypatch.setattr(
            "app.services.elevation._get_rasterio_dataset",
            lambda path: MockDatasetReader(),
        )

        # Test with nodata value
        elevation = get_elevation_from_alos(35.6895, 139.6917)
        assert elevation is None


def test_get_elevation_from_alos_none_value(app, mock_rasterio, monkeypatch):
    """Test getting elevation for a point with None value."""
    with app.app_context():
        # Mock to return None value
        class MockDatasetReader:
            def __init__(self, *args, **kwargs):
                from rasterio.transform import Affine

                self.bounds = type(
                    "obj",
                    (object,),
                    {"left": -180, "right": 180, "bottom": -90, "top": 90},
                )
                self.nodata = -9999
                self.transform = Affine(0.1, 0, -180, 0, -0.1, 90)

            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

            def sample(self, coords):
                return iter([[None] for _ in coords])  # Return None value

        monkeypatch.setattr(
            "app.services.elevation._get_rasterio_dataset",
            lambda path: MockDatasetReader(),
        )

        # Test with None value
        elevation = get_elevation_from_alos(35.6895, 139.6917)
        assert elevation is None


def test_get_elevation_from_alos_sample_error(app, mock_rasterio, monkeypatch):
    """Test handling of StopIteration in sample method."""
    with app.app_context():
        # Mock to raise StopIteration
        class MockDatasetReader:
            def __init__(self, *args, **kwargs):
                from rasterio.transform import Affine

                self.bounds = type(
                    "obj",
                    (object,),
                    {"left": -180, "right": 180, "bottom": -90, "top": 90},
                )
                self.nodata = -9999
                self.transform = Affine(0.1, 0, -180, 0, -0.1, 90)

            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

            def sample(self, coords):
                return iter([])  # Empty iterator will raise StopIteration

        monkeypatch.setattr(
            "app.services.elevation._get_rasterio_dataset",
            lambda path: MockDatasetReader(),
        )

        # Test with StopIteration
        elevation = get_elevation_from_alos(35.6895, 139.6917)
        assert elevation is None


def test_get_rasterio_dataset():
    """Test the _get_rasterio_dataset function directly."""
    with patch("rasterio.open") as mock_open:
        # Call the function
        _get_rasterio_dataset("/test/path.tif")
        # Verify that rasterio.open was called with the correct path
        mock_open.assert_called_once_with("/test/path.tif")
