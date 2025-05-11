"""
Blueprint for elevation lookup endpoints.
"""

from flask import Blueprint, request, jsonify, current_app
from app.services.elevation import create_elevation_service_from_flask

lookup_bp = Blueprint("lookup", __name__, url_prefix="/api/v1")


@lookup_bp.route("/lookup", methods=["POST"])
def get_elevations():
    """
    Lookup elevations for multiple locations.
    """
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
    data = request.get_json()
    locations = data.get("locations")
    if not isinstance(locations, list):
        return jsonify({"error": "Missing or invalid 'locations' array"}), 400

    elevation_service = create_elevation_service_from_flask(current_app)
    results = []

    for loc in locations:
        lat = loc.get("latitude")
        lon = loc.get("longitude")
        try:
            lat = float(lat)
            lon = float(lon)
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                raise ValueError("Coordinates out of valid range")
        except (TypeError, ValueError):
            continue
        elevation = elevation_service.get_point_elevation(lat, lon)
        results.append({"latitude": lat, "longitude": lon, "elevation": elevation})
    return jsonify({"results": results})
