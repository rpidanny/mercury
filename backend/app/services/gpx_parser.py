"""
Service for parsing GPX files and extracting track information.
"""

from typing import List, Tuple, Dict, Any, Optional
import xml.etree.ElementTree as ET
from io import BytesIO


class GpxParser:
    """
    Service for parsing GPX files and extracting track points.

    This class provides methods to extract track points from GPX files
    and convert them to a format compatible with the elevation service.
    """

    @staticmethod
    def parse_gpx(gpx_data: bytes) -> List[Dict[str, float]]:
        """
        Parse GPX file data and extract track points.

        Args:
            gpx_data: Raw GPX file data as bytes

        Returns:
            List of dictionaries with 'latitude' and 'longitude' keys

        Raises:
            ValueError: If the GPX data is invalid or contains no trackpoints
        """
        try:
            # Parse GPX file
            tree = ET.parse(BytesIO(gpx_data))
            root = tree.getroot()

            # Extract namespace if present
            ns = {"gpx": root.tag.split("}")[0].strip("{")} if "}" in root.tag else {}
            ns_prefix = f"{{{ns['gpx']}}}" if "gpx" in ns else ""

            # Extract track points from tracks and track segments
            track_points = []

            # Find all track points - first look for tracks
            for track in root.findall(f".//{ns_prefix}trk"):
                for segment in track.findall(f".//{ns_prefix}trkseg"):
                    for point in segment.findall(f".//{ns_prefix}trkpt"):
                        lat = float(point.get("lat"))
                        lon = float(point.get("lon"))
                        track_points.append({"latitude": lat, "longitude": lon})

            # If no track points found, look for route points
            if not track_points:
                for route in root.findall(f".//{ns_prefix}rte"):
                    for point in route.findall(f".//{ns_prefix}rtept"):
                        lat = float(point.get("lat"))
                        lon = float(point.get("lon"))
                        track_points.append({"latitude": lat, "longitude": lon})

            # If still no points found, look for waypoints
            if not track_points:
                for point in root.findall(f".//{ns_prefix}wpt"):
                    lat = float(point.get("lat"))
                    lon = float(point.get("lon"))
                    track_points.append({"latitude": lat, "longitude": lon})

            if not track_points:
                raise ValueError("No track points found in GPX file")

            return track_points

        except ET.ParseError as e:
            raise ValueError(f"Invalid GPX data: {e}")
        except Exception as e:
            raise ValueError(f"Error parsing GPX data: {e}")

    @staticmethod
    def calculate_bounds(
        track_points: List[Dict[str, float]], padding_factor: float = 0.2
    ) -> Dict[str, float]:
        """
        Calculate bounds for the given track points with padding.

        Args:
            track_points: List of track points
            padding_factor: Factor to expand the bounds by (0.2 = 20% extra on each side)

        Returns:
            Dictionary with min_latitude, min_longitude, max_latitude, max_longitude

        Raises:
            ValueError: If track_points is empty
        """
        if not track_points:
            raise ValueError("No track points provided")

        # Extract latitudes and longitudes
        lats = [point["latitude"] for point in track_points]
        lons = [point["longitude"] for point in track_points]

        # Find min/max
        min_lat = min(lats)
        max_lat = max(lats)
        min_lon = min(lons)
        max_lon = max(lons)

        # Calculate center and width/height
        center_lat = (min_lat + max_lat) / 2
        center_lon = (min_lon + max_lon) / 2
        width_lat = max_lat - min_lat
        width_lon = max_lon - min_lon

        # Apply padding
        padded_width_lat = width_lat * (1 + padding_factor * 2)
        padded_width_lon = width_lon * (1 + padding_factor * 2)

        # Calculate new bounds
        return {
            "min_latitude": center_lat - padded_width_lat / 2,
            "max_latitude": center_lat + padded_width_lat / 2,
            "min_longitude": center_lon - padded_width_lon / 2,
            "max_longitude": center_lon + padded_width_lon / 2,
        }
