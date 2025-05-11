import pytest
import logging
from app.services.elevation import ElevationService, create_elevation_service_from_flask
from unittest.mock import patch, MagicMock


def test_get_elevation_service_factory(app):
    """Test creating the ElevationService using the factory function."""
    with app.app_context():
        service = create_elevation_service_from_flask(app)
        assert service.dsm_path is not None
        assert service.logger is app.logger


def test_constructor_with_explicit_params():
    """Test creating the ElevationService with explicit parameters."""
    logger = logging.getLogger("test_logger")
    dsm_path = "/path/to/test/dsm.tif"

    service = ElevationService(logger=logger, dsm_path=dsm_path)

    assert service.logger is logger
    assert service.dsm_path == dsm_path


def test_get_elevation_from_point(app, mock_rasterio):
    """Test getting elevation for a single point."""
    with app.app_context():
        # Create service instance
        service = create_elevation_service_from_flask(app)

        # Test with coordinates near Mount Everest (within the test VRT file)
        elevation = service.get_point_elevation(27.98, 86.92)

        # Real elevation data - don't check exact value but ensure it's reasonable for Mount Everest
        assert elevation is not None
        assert 7000 < elevation < 9000  # Reasonable range for Everest area


def test_get_elevation_grid(app, mock_rasterio):
    """Test getting elevation for a grid of points."""
    with app.app_context():
        # Create service instance
        service = create_elevation_service_from_flask(app)

        # Use coordinates within the test VRT file (Mount Everest area)
        lat_vals = [27.95, 27.96, 27.97, 27.98, 27.99]
        lon_vals = [86.91, 86.92, 86.93, 86.94, 86.95]
        res = 5

        results, width, height = service.get_elevation_grid(lat_vals, lon_vals, res)

        # Check dimensions
        assert width == res
        assert height == res
        assert len(results) == res * res

        # Check values - with real data, all we can do is check they're reasonable
        for result in results:
            assert "latitude" in result
            assert "longitude" in result
            assert "elevation" in result
            assert result["elevation"] is not None
            # Ensure values are within reasonable range for Mount Everest area
            # (some might be lower depending on exact location)
            assert 5000 < result["elevation"] < 9000


def test_get_elevation_error_handling(app, test_data_path):
    """Test error handling in get_point_elevation."""
    with app.app_context():
        # Create service instance using a mock logger to verify logging
        mock_logger = MagicMock()
        service = ElevationService(logger=mock_logger, dsm_path=test_data_path)

        # Mock the rasterio.open function to raise an exception
        with patch("rasterio.open") as mock_open:
            mock_open.side_effect = Exception("Test exception")

            # Function should return None on error
            elevation = service.get_point_elevation(35.6895, 139.6917)
            assert elevation is None

        # Verify that the exception was logged
        mock_logger.exception.assert_called_once()


def test_get_elevation_grid_error_handling(app, test_data_path):
    """Test error handling in get_elevation_grid."""
    with app.app_context():
        # Create service instance using a mock logger to verify logging
        mock_logger = MagicMock()
        service = ElevationService(logger=mock_logger, dsm_path=test_data_path)

        # Mock the rasterio.open function to raise an exception
        with patch("rasterio.open") as mock_open:
            mock_open.side_effect = Exception("Test exception")

            lat_vals = [35.0, 35.1, 35.2, 35.3, 35.4]
            lon_vals = [139.0, 139.1, 139.2, 139.3, 139.4]
            res = 5

            # Function should re-raise the exception
            with pytest.raises(Exception):
                service.get_elevation_grid(lat_vals, lon_vals, res)

        # Verify that the exception was logged
        mock_logger.exception.assert_called_once()


def test_get_elevation_out_of_bounds(app, test_data_path):
    """Test getting elevation for a point outside the raster bounds."""
    with app.app_context():
        # Create service instance using a mock logger to verify logging
        mock_logger = MagicMock()
        service = ElevationService(logger=mock_logger, dsm_path=test_data_path)

        # Test with coordinates far from Mount Everest (outside the VRT bounds)
        # Based on the GeoTransform in the VRT file, we know the data is in the Mount Everest region
        # Use coordinates completely outside that geographical area
        elevation = service.get_point_elevation(
            40.0, 120.0
        )  # Far from Mt. Everest area
        assert elevation is None

        # Verify that a warning was logged
        mock_logger.warning.assert_called_once()


def test_get_elevation_sample_empty_iterator(app, monkeypatch):
    """Test handling of StopIteration in sample method."""
    # Create service instance using a mock logger to verify logging
    mock_logger = MagicMock()
    service = ElevationService(logger=mock_logger, dsm_path="/test/path.tif")

    # Create a mock dataset with a sample method that returns an empty iterator
    class MockEmptyIteratorDataset:
        def __init__(self, *args, **kwargs):
            self.bounds = type(
                "obj", (object,), {"left": -180, "right": 180, "bottom": -90, "top": 90}
            )
            self.nodata = None

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def sample(self, coords):
            # Empty iterator will raise StopIteration
            return iter([])

        def close(self):
            # Add close method to avoid warnings
            pass

    # Mock the rasterio.open function
    monkeypatch.setattr(
        "rasterio.open", lambda *args, **kwargs: MockEmptyIteratorDataset()
    )

    # Function should return None due to StopIteration
    elevation = service.get_point_elevation(27.98, 86.92)
    assert elevation is None

    # Verify that a warning was logged
    mock_logger.warning.assert_called_once()


def test_get_elevation_nodata_value(monkeypatch):
    """Test handling of nodata values."""
    # Create service instance using a mock logger to verify logging
    mock_logger = MagicMock()
    service = ElevationService(logger=mock_logger, dsm_path="/test/path.tif")

    # Create a mock dataset that returns nodata values
    class MockNoDataDataset:
        def __init__(self, *args, **kwargs):
            self.bounds = type(
                "obj", (object,), {"left": -180, "right": 180, "bottom": -90, "top": 90}
            )
            self.nodata = -9999

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def sample(self, coords):
            # Return nodata value
            return iter([[-9999]])

        def close(self):
            # Add close method to avoid warnings
            pass

    # Mock the rasterio.open function
    monkeypatch.setattr("rasterio.open", lambda *args, **kwargs: MockNoDataDataset())

    # Function should return None due to nodata value
    elevation = service.get_point_elevation(27.98, 86.92)
    assert elevation is None

    # Verify that two debug messages were logged:
    # 1. One for opening the dataset
    # 2. One for the nodata value
    assert mock_logger.debug.call_count == 2
    # Verify the second call was for the nodata value
    mock_logger.debug.assert_any_call("No data value at (27.980000, 86.920000).")


def test_get_elevation_none_value(monkeypatch):
    """Test handling of None values."""
    # Create service instance using a mock logger to verify logging
    mock_logger = MagicMock()
    service = ElevationService(logger=mock_logger, dsm_path="/test/path.tif")

    # Create a mock dataset that returns None values
    class MockNoneValueDataset:
        def __init__(self, *args, **kwargs):
            self.bounds = type(
                "obj", (object,), {"left": -180, "right": 180, "bottom": -90, "top": 90}
            )
            self.nodata = -9999

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def sample(self, coords):
            # Return None value
            return iter([[None]])

        def close(self):
            # Add close method to avoid warnings
            pass

    # Mock the rasterio.open function
    monkeypatch.setattr("rasterio.open", lambda *args, **kwargs: MockNoneValueDataset())

    # Function should return None when the sampled value is None
    elevation = service.get_point_elevation(27.98, 86.92)
    assert elevation is None

    # Verify that a warning was logged
    mock_logger.warning.assert_called_once()
