"""
Blueprint for elevation grid endpoints.
"""

from flask import Blueprint, request, jsonify, current_app
from app.utils.geometry import linspace

grid_bp = Blueprint("grid", __name__, url_prefix="/api/v1")


@grid_bp.route("/grid", methods=["POST"])
def get_elevation_grid():
    """Generate grid of GPS points and lookup elevations."""
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
    data = request.get_json()
    bounds = data.get("bounds")
    res = data.get("resolution")
    if not isinstance(bounds, dict) or not isinstance(res, int):
        return jsonify({"error": "Missing or invalid 'bounds' or 'resolution'"}), 400
    try:
        min_lat = float(bounds["min_latitude"])
        min_lon = float(bounds["min_longitude"])
        max_lat = float(bounds["max_latitude"])
        max_lon = float(bounds["max_longitude"])
        res = max(1, res)
    except (TypeError, ValueError, KeyError):
        return jsonify({"error": "Invalid bounds or resolution"}), 400

    lat_vals = linspace(min_lat, max_lat, res)
    lon_vals = linspace(min_lon, max_lon, res)

    # Get the shared elevation service instance
    elevation_service = current_app.elevation_service
    results, width, height = elevation_service.get_elevation_grid(
        lat_vals, lon_vals, res
    )

    return jsonify({"results": results, "width": width, "height": height})
