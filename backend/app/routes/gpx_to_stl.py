"""
Blueprint for GPX to STL conversion endpoints.
"""

from flask import Blueprint, request, jsonify, current_app, send_file
from io import BytesIO
import logging

from ..services.gpx_parser import GpxParser
from ..services.model_generator import ModelGenerator

gpx_to_stl_bp = Blueprint("gpx_to_stl", __name__, url_prefix="/api/v1")


@gpx_to_stl_bp.route("/gpx-to-stl", methods=["POST"])
def convert_gpx_to_stl():
    """
    Convert GPX file to STL 3D terrain model.

    This endpoint accepts a GPX file and optional parameters,
    and returns an STL file of the terrain with the GPX track embedded.
    """
    # Check if file was uploaded
    if "gpx_file" not in request.files:
        return jsonify({"error": "No GPX file provided"}), 400

    gpx_file = request.files["gpx_file"]
    if not gpx_file.filename:
        return jsonify({"error": "Empty filename"}), 400

    # Get parameters with defaults
    grid_resolution = int(request.form.get("resolution", 50))
    model_width_mm = float(request.form.get("model_width_mm", 100.0))
    altitude_multiplier = float(request.form.get("altitude_multiplier", 1.0))
    padding_factor = float(request.form.get("padding_factor", 0.2))

    # Validate parameters
    if grid_resolution < 10 or grid_resolution > 20000:
        return jsonify({"error": "Resolution must be between 10 and 20000"}), 400
    if model_width_mm < 10 or model_width_mm > 500:
        return jsonify({"error": "Model width must be between 10mm and 500mm"}), 400
    if altitude_multiplier <= 0 or altitude_multiplier > 15:
        return jsonify({"error": "Altitude multiplier must be between 0 and 15"}), 400

    try:
        # Read GPX file
        gpx_data = gpx_file.read()

        # Parse GPX file to get track points
        track_points = GpxParser.parse_gpx(gpx_data)

        # Calculate bounds with padding
        bounds = GpxParser.calculate_bounds(track_points, padding_factor)

        # Get the shared elevation service instance
        elevation_service = current_app.elevation_service

        # Get elevation grid for the bounds area
        results, width, height = elevation_service.get_elevation_grid(
            bounds, grid_resolution
        )

        # Get elevations for track points
        track_elevations = []
        for point in track_points:
            elev = elevation_service.get_point_elevation(
                point["latitude"], point["longitude"]
            )
            track_elevations.append(elev)

        # Generate STL model
        stl_data = ModelGenerator.generate_stl(
            results,
            track_points,
            track_elevations,
            width,
            height,
            model_width_mm=model_width_mm,
            altitude_multiplier=altitude_multiplier,
        )

        # Create a file-like object to send the STL file
        stl_io = BytesIO(stl_data)

        # Determine output filename
        original_filename = gpx_file.filename
        output_filename = original_filename.rsplit(".", 1)[0] + ".stl"

        # Return the STL file
        return send_file(
            stl_io,
            mimetype="application/vnd.ms-pki.stl",
            as_attachment=True,
            download_name=output_filename,
        )

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        current_app.logger.exception(f"Error converting GPX to STL: {e}")
        return jsonify({"error": "An error occurred during conversion"}), 500
