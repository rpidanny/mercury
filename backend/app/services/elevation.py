"""
Elevation service functions.
"""

from flask import current_app
import rasterio
from rasterio.windows import from_bounds
from rasterio.enums import Resampling


def get_elevation_from_alos(lat: float, lon: float) -> float | None:
    """
    Gets elevation for a single point from ALOS DSM.

    Returns:
        float or None: Elevation in meters, or None if out of bounds or error.
    """
    path = current_app.config["ALOS_DATA_PATH"]
    logger = current_app.logger
    try:
        with rasterio.open(path) as src:
            # Check if coordinates are within the raster bounds
            if not (
                src.bounds.left <= lon <= src.bounds.right
                and src.bounds.bottom <= lat <= src.bounds.top
            ):
                logger.warning(
                    f"Coordinates ({lat:.6f}, {lon:.6f}) outside ALOS DSM raster bounds."
                )
                return None
            # Sample the raster at the given coordinates
            try:
                value = next(src.sample([(lon, lat)]))[0]
            except StopIteration:
                logger.warning(f"No sample returned at ({lat:.6f}, {lon:.6f}).")
                return None
            # Check nodata
            if src.nodata is not None and value == src.nodata:
                logger.debug(f"Nodata value ({src.nodata}) at ({lat:.6f}, {lon:.6f}).")
                return None
            if value is None:
                logger.warning(f"Null value at ({lat:.6f}, {lon:.6f}).")
                return None
            elevation = float(value)
            logger.debug(f"Elevation at ({lat:.6f}, {lon:.6f}): {elevation:.2f}m")
            return elevation
    except Exception as e:
        logger.exception(f"Error reading DSM data for ({lat:.6f}, {lon:.6f}): {e}")
        return None


def get_elevation_grid(
    lat_vals: list[float], lon_vals: list[float], res: int
) -> tuple[list[dict], int, int]:
    """
    Generate grid elevations for lists of latitudes and longitudes.

    Returns:
        results: list of dicts with latitude, longitude, and elevation
        width, height: resolution values
    """
    path = current_app.config["ALOS_DATA_PATH"]
    logger = current_app.logger
    results = []
    try:
        with rasterio.open(path) as src:
            win = from_bounds(
                min(lon_vals),
                min(lat_vals),
                max(lon_vals),
                max(lat_vals),
                src.transform,
            )
            elev_array = src.read(
                1,
                window=win,
                out_shape=(res, res),
                resampling=Resampling.nearest,
                boundless=True,
            )
            for i, lat in enumerate(lat_vals):
                for j, lon in enumerate(lon_vals):
                    val = elev_array[i][j]
                    elev = (
                        None
                        if (src.nodata is not None and val == src.nodata)
                        else float(val)
                    )
                    results.append(
                        {"latitude": lat, "longitude": lon, "elevation": elev}
                    )
        return results, res, res
    except Exception as e:
        logger.exception(f"Error generating grid elevations: {e}")
        raise
