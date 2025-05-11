"""
Elevation service for querying digital surface model (DSM) data.
"""

from typing import Optional, List, Tuple, Dict, Any, Protocol, Union
import logging
import rasterio
from rasterio.windows import from_bounds
from rasterio.enums import Resampling


class LoggerProtocol(Protocol):
    """Protocol for logger objects compatible with standard logging interface."""

    def debug(self, msg: str, *args, **kwargs) -> None: ...
    def info(self, msg: str, *args, **kwargs) -> None: ...
    def warning(self, msg: str, *args, **kwargs) -> None: ...
    def error(self, msg: str, *args, **kwargs) -> None: ...
    def exception(self, msg: str, *args, **kwargs) -> None: ...


class ElevationService:
    """
    Service for querying elevation data from digital surface models (DSM).

    This class provides methods to query elevation data for single points
    or to generate elevation grids for rectangular regions.
    """

    def __init__(self, logger: LoggerProtocol, dsm_path: str):
        """
        Initialize the elevation service.

        Args:
            logger: Logger instance for recording service activity
            dsm_path: Path to the DSM data file (e.g., GeoTIFF or VRT)
        """
        self.logger = logger
        self.dsm_path = dsm_path
        self._dataset = None

    def _get_dataset(self) -> rasterio.DatasetReader:
        """
        Get a rasterio dataset for reading, reusing a cached dataset when possible.

        This method caches the dataset after first opening it, and reuses the same
        dataset for subsequent calls, improving performance.

        Returns:
            A rasterio dataset reader object.
        """
        # If we don't have a dataset yet, open it
        if self._dataset is None:
            # Open and cache the dataset
            self.logger.debug(f"Opening dataset at {self.dsm_path}")
            self._dataset = rasterio.open(self.dsm_path)

        return self._dataset

    def get_point_elevation(self, lat: float, lon: float) -> Optional[float]:
        """
        Get elevation for a single geographic point.

        Args:
            lat: Latitude in decimal degrees
            lon: Longitude in decimal degrees

        Returns:
            Elevation in meters, or None if the point is out of bounds or has no data
        """
        try:
            dataset = self._get_dataset()

            # Check if coordinates are within dataset bounds
            if not self._is_point_in_bounds(dataset, lat, lon):
                self.logger.warning(
                    f"Coordinates ({lat:.6f}, {lon:.6f}) outside DSM raster bounds."
                )
                return None

            # Get elevation from dataset
            try:
                value = next(dataset.sample([(lon, lat)]))[0]
            except StopIteration:
                self.logger.warning(f"No sample returned at ({lat:.6f}, {lon:.6f}).")
                return None

            # Handle no-data values
            if self._is_nodata(dataset, value):
                self.logger.debug(f"No data value at ({lat:.6f}, {lon:.6f}).")
                return None

            if value is None:
                self.logger.warning(f"Null value at ({lat:.6f}, {lon:.6f}).")
                return None

            elevation = float(value)
            self.logger.debug(f"Elevation at ({lat:.6f}, {lon:.6f}): {elevation:.2f}m")
            return elevation

        except Exception as e:
            self.logger.exception(
                f"Error reading DSM data for ({lat:.6f}, {lon:.6f}): {e}"
            )
            return None

    def get_elevation_grid(
        self, lat_vals: List[float], lon_vals: List[float], resolution: int
    ) -> Tuple[List[Dict[str, Any]], int, int]:
        """
        Generate a grid of elevations from lists of latitudes and longitudes.

        Args:
            lat_vals: List of latitude values
            lon_vals: List of longitude values
            resolution: Grid resolution (number of points in each dimension)

        Returns:
            Tuple containing:
            - List of dicts with latitude, longitude, and elevation
            - Grid width
            - Grid height

        Raises:
            Exception: If an error occurs during grid generation
        """
        results = []

        try:
            dataset = self._get_dataset()

            # Define a window within the dataset
            window = from_bounds(
                min(lon_vals),
                min(lat_vals),
                max(lon_vals),
                max(lat_vals),
                dataset.transform,
            )

            # Read the elevation data in the window
            elev_array = dataset.read(
                1,
                window=window,
                out_shape=(resolution, resolution),
                resampling=Resampling.nearest,
                boundless=True,
            )

            # Build the result grid
            for i, lat in enumerate(lat_vals):
                for j, lon in enumerate(lon_vals):
                    val = elev_array[i][j]
                    elevation = None if self._is_nodata(dataset, val) else float(val)
                    results.append(
                        {"latitude": lat, "longitude": lon, "elevation": elevation}
                    )

            return results, resolution, resolution

        except Exception as e:
            self.logger.exception(f"Error generating grid elevations: {e}")
            raise

    def _is_point_in_bounds(self, dataset, lat: float, lon: float) -> bool:
        """
        Check if a point is within the bounds of the dataset.

        Args:
            dataset: Rasterio dataset
            lat: Latitude in decimal degrees
            lon: Longitude in decimal degrees

        Returns:
            True if the point is within bounds, False otherwise
        """
        return (
            dataset.bounds.left <= lon <= dataset.bounds.right
            and dataset.bounds.bottom <= lat <= dataset.bounds.top
        )

    def _is_nodata(self, dataset, value) -> bool:
        """
        Check if a value is a no-data value in the dataset.

        Args:
            dataset: Rasterio dataset
            value: Value to check

        Returns:
            True if the value is a no-data value, False otherwise
        """
        return dataset.nodata is not None and value == dataset.nodata

    def close(self) -> None:
        """
        Close the cached dataset.

        This method should be called when the service is no longer needed
        to properly release resources.
        """
        if self._dataset is not None:
            self.logger.debug(f"Closing dataset at {self.dsm_path}")
            self._dataset.close()
            self._dataset = None

    def __del__(self) -> None:
        """
        Clean up resources when the object is garbage collected.

        This ensures the dataset is closed if the user forgets to call close().
        """
        self.close()


# Factory function to create an ElevationService from a Flask app
def create_elevation_service_from_flask(app) -> ElevationService:
    """
    Creates an ElevationService instance from a Flask application.

    Args:
        app: The Flask application

    Returns:
        An initialized ElevationService
    """
    return ElevationService(logger=app.logger, dsm_path=app.config["ALOS_DATA_PATH"])
