"""
Blueprint for elevation grid endpoints.
"""

from flask import Blueprint, request, jsonify, current_app

grid_bp = Blueprint("grid", __name__, url_prefix="/api/v1")


@grid_bp.route("/grid", methods=["POST"])
def get_elevation_grid():
    """Generate grid of GPS points and lookup elevations."""
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    bounds = data.get("bounds")
    res = data.get("resolution")

    # Validate input
    if not isinstance(bounds, dict) or not isinstance(res, int):
        return jsonify({"error": "Missing or invalid 'bounds' or 'resolution'"}), 400

    try:
        # Validate bounds
        required_keys = [
            "min_latitude",
            "min_longitude",
            "max_latitude",
            "max_longitude",
        ]
        for key in required_keys:
            if key not in bounds:
                return jsonify({"error": f"Missing required bound: {key}"}), 400
            bounds[key] = float(bounds[key])

        # Ensure resolution is positive
        res = max(1, res)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid bounds or resolution"}), 400

    # Get the shared elevation service instance
    elevation_service = current_app.elevation_service

    # Get elevation grid directly using bounds
    results, width, height = elevation_service.get_elevation_grid(bounds, res)

    return jsonify({"results": results, "width": width, "height": height})
