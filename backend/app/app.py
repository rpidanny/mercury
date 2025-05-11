"""
Entry point for the ALOS DSM API application.
"""

from flask import Flask, request, g
from time import time
from flask_cors import CORS

from app.config import ALOS_DATA_PATH
from app.utils.logger import configure_logging
from app.routes.lookup import lookup_bp
from app.routes.grid import grid_bp


def create_app():
    """
    Create and configure the Flask application.
    """
    app = Flask(__name__)
    # Load configuration
    app.config["ALOS_DATA_PATH"] = ALOS_DATA_PATH
    # Enable CORS
    CORS(app)
    # Configure logging
    configure_logging(app)

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

    # Register API blueprints
    app.register_blueprint(lookup_bp)
    app.register_blueprint(grid_bp)
    return app


# Create the Flask app for running
app = create_app()

if __name__ == "__main__":
    # Allow running with `python app/app.py`
    app.run(host="0.0.0.0", port=8000, debug=True)
