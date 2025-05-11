"""
Entry point for the ALOS DSM API application.
"""

import sys
from flask import Flask, request, g, jsonify, abort
from time import time
from flask_cors import CORS

try:
    from app.config import Config

    # Create a config instance for this application
    config = Config()
except ValueError as e:
    print(f"Configuration error: {e}", file=sys.stderr)
    sys.exit(1)

from app.utils.logger import configure_logging
from app.routes.lookup import lookup_bp
from app.routes.grid import grid_bp
from app.version import VERSION


def create_app():
    """
    Create and configure the Flask application.
    """
    app = Flask(__name__)
    # Load configuration
    app.config["ALOS_DATA_PATH"] = config.alos_data_path
    app.config["DEBUG"] = config.debug

    # Enable CORS
    CORS(app)
    # Configure logging
    configure_logging(app, log_level=config.log_level)

    # Request timing: record start time and log duration on each request
    @app.before_request
    def start_timer():
        g.start_time = time()

    @app.after_request
    def log_request(response):
        duration = time() - getattr(g, "start_time", time())
        app.logger.info(
            f"{request.method} {request.path} {response.status_code} completed in {duration:.3f}s"
        )
        return response

    # Version endpoint
    @app.route("/version")
    def version():
        return jsonify({"version": VERSION})

    # Register API blueprints
    app.register_blueprint(lookup_bp)
    app.register_blueprint(grid_bp)
    return app


# Create the Flask app for running
app = create_app()

if __name__ == "__main__":
    # Allow running with `python app/app.py`
    app.run(host=config.host, port=config.port, debug=config.debug)
