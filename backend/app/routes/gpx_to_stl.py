"""
Blueprint for GPX to STL conversion endpoints.
"""

from flask import Blueprint, request, jsonify, current_app, send_file
from io import BytesIO
import logging
import os
import tempfile
import time

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
    logger = current_app.logger
    overall_start_time = time.time()
    logger.info("Starting GPX to STL conversion")

    # Check if file was uploaded
    if "gpx_file" not in request.files:
        logger.warning("No GPX file provided in request")
        return jsonify({"error": "No GPX file provided"}), 400

    gpx_file = request.files["gpx_file"]
    if not gpx_file.filename:
        logger.warning("Empty filename in GPX file upload")
        return jsonify({"error": "Empty filename"}), 400

    # Get parameters with defaults
    try:
        logger.debug("Parsing request parameters")
        grid_resolution = int(request.form.get("resolution", 50))
        model_width_mm = float(request.form.get("model_width_mm", 100.0))
        altitude_multiplier = float(request.form.get("altitude_multiplier", 1.0))
        padding_factor = float(request.form.get("padding_factor", 0.2))

        logger.debug(
            f"Parsed parameters: resolution={grid_resolution}, "
            + f"model_width_mm={model_width_mm}, "
            + f"altitude_multiplier={altitude_multiplier}, "
            + f"padding_factor={padding_factor}"
        )
    except ValueError as e:
        logger.warning(f"Invalid parameter format: {e}")
        return (
            jsonify(
                {
                    "error": "Invalid parameter format. Resolution must be an integer, model_width_mm and altitude_multiplier must be numbers."
                }
            ),
            400,
        )

    # Validate parameters
    logger.debug("Validating parameters")
    if grid_resolution < 10 or grid_resolution > 5000:
        logger.warning(f"Invalid resolution: {grid_resolution}")
        return jsonify({"error": "Resolution must be between 10 and 5000"}), 400
    if model_width_mm < 10 or model_width_mm > 300:
        logger.warning(f"Invalid model width: {model_width_mm}")
        return jsonify({"error": "Model width must be between 10mm and 300mm"}), 400
    if altitude_multiplier <= 0 or altitude_multiplier > 5:
        logger.warning(f"Invalid altitude multiplier: {altitude_multiplier}")
        return jsonify({"error": "Altitude multiplier must be between 0 and 5"}), 400
    if padding_factor < 0 or padding_factor > 20:
        logger.warning(f"Invalid padding factor: {padding_factor}")
        return jsonify({"error": "Padding factor must be between 0 and 20"}), 400

    try:
        # Read GPX file
        logger.debug(f"Reading GPX file: {gpx_file.filename}")
        gpx_read_start = time.time()
        gpx_data = gpx_file.read()
        logger.debug(
            f"Read {len(gpx_data)} bytes from GPX file in {time.time()-gpx_read_start:.2f}s"
        )

        # Parse GPX file to get track points
        logger.debug("Parsing GPX file")
        parse_start = time.time()
        track_points = GpxParser.parse_gpx(gpx_data)
        logger.info(
            f"Parsed {len(track_points)} track points in {time.time()-parse_start:.2f}s"
        )

        # Sample track points for very large tracks to improve performance
        if len(track_points) > 5000:
            logger.info(
                f"Large track detected with {len(track_points)} points, sampling down"
            )
            sample_ratio = max(1, len(track_points) // 1000)
            track_points = track_points[::sample_ratio]
            logger.info(
                f"Sampled to {len(track_points)} points (ratio 1:{sample_ratio})"
            )

        # Calculate bounds with padding
        logger.debug("Calculating geographic bounds")
        bounds_start = time.time()
        bounds = GpxParser.calculate_bounds(track_points, padding_factor)
        logger.debug(f"Calculated bounds in {time.time()-bounds_start:.2f}s: {bounds}")

        # Get the shared elevation service instance
        elevation_service = current_app.elevation_service

        # Get elevation grid for the bounds area
        logger.info(f"Fetching elevation grid (resolution: {grid_resolution})")
        grid_start = time.time()
        results, width, height = elevation_service.get_elevation_grid(
            bounds, grid_resolution
        )
        logger.info(
            f"Fetched elevation grid {width}x{height} in {time.time()-grid_start:.2f}s"
        )

        # Count valid elevation points
        valid_points = sum(1 for point in results if point[2] is not None)
        logger.debug(f"Grid has {valid_points}/{len(results)} valid elevation points")

        # Get elevations for track points
        logger.debug("Getting elevations for track points")
        track_elev_start = time.time()
        track_elevations = []
        for point in track_points:
            elev = elevation_service.get_point_elevation(
                point["latitude"], point["longitude"]
            )
            track_elevations.append(elev)

        valid_track_elevs = sum(1 for elev in track_elevations if elev is not None)
        logger.debug(
            f"Got {valid_track_elevs}/{len(track_elevations)} valid track elevations in {time.time()-track_elev_start:.2f}s"
        )

        # Generate STL model
        logger.info(
            f"Generating STL model (width: {model_width_mm}mm, altitude multiplier: {altitude_multiplier})"
        )
        stl_start = time.time()
        stl_data = ModelGenerator.generate_stl(
            results,
            track_points,
            track_elevations,
            width,
            height,
            model_width_mm=model_width_mm,
            altitude_multiplier=altitude_multiplier,
            logger=logger,
        )
        logger.info(
            f"STL model generated in {time.time()-stl_start:.2f}s, size: {len(stl_data)/1024:.1f}KB"
        )

        # Create a file-like object to send the STL file
        stl_io = BytesIO(stl_data)

        # Determine output filename
        original_filename = gpx_file.filename
        output_filename = original_filename.rsplit(".", 1)[0] + ".stl"
        logger.debug(f"Output filename: {output_filename}")

        # Return the STL file
        logger.info(
            f"Completed GPX to STL conversion in {time.time()-overall_start_time:.2f}s"
        )
        return send_file(
            stl_io,
            mimetype="application/vnd.ms-pki.stl",
            as_attachment=True,
            download_name=output_filename,
        )

    except ValueError as e:
        logger.warning(f"Invalid input: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.exception(f"Error converting GPX to STL: {e}")
        return (
            jsonify(
                {
                    "error": "An error occurred during conversion. This might be due to a large or complex file, or server resource constraints."
                }
            ),
            500,
        )
