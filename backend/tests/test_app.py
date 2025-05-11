import json
import pytest
import sys
from unittest.mock import patch
from app.version import VERSION


def test_create_app(app):
    """Test that the app was created successfully."""
    assert app is not None


def test_version_endpoint(client):
    """Test the /version endpoint."""
    response = client.get("/version")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["version"] == VERSION


def test_lookup_endpoint_valid(client, mock_rasterio):
    """Test the /api/v1/lookup endpoint with valid data."""
    test_data = {
        "locations": [
            {"latitude": 27.98, "longitude": 86.92},  # Mount Everest area
            {"latitude": 27.985, "longitude": 86.925},  # Mount Everest area
        ]
    }
    response = client.post(
        "/api/v1/lookup", data=json.dumps(test_data), content_type="application/json"
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "results" in data
    assert len(data["results"]) == 2
    # Check that we get reasonable values for Everest area
    for result in data["results"]:
        assert result["elevation"] is not None
        assert 5000 < result["elevation"] < 9000  # Reasonable range for Everest
        assert "latitude" in result
        assert "longitude" in result


def test_lookup_endpoint_invalid_json(client):
    """Test the /api/v1/lookup endpoint with invalid JSON."""
    response = client.post("/api/v1/lookup", data="not json", content_type="text/plain")
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data
    assert data["error"] == "Request must be JSON"


def test_lookup_endpoint_missing_locations(client):
    """Test the /api/v1/lookup endpoint without locations."""
    response = client.post(
        "/api/v1/lookup", data=json.dumps({}), content_type="application/json"
    )
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data


def test_lookup_endpoint_invalid_coords(client, mock_rasterio):
    """Test the /api/v1/lookup endpoint with invalid coordinates."""
    test_data = {
        "locations": [
            {"latitude": "not-a-number", "longitude": 86.92},
            {"latitude": 27.98, "longitude": 86.92},  # Mount Everest area
        ]
    }
    response = client.post(
        "/api/v1/lookup", data=json.dumps(test_data), content_type="application/json"
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "results" in data
    # Should have only processed the valid entry
    assert len(data["results"]) == 1


def test_grid_endpoint_valid(client, mock_rasterio):
    """Test the /api/v1/grid endpoint with valid data."""
    test_data = {
        "bounds": {
            "min_latitude": 27.97,
            "max_latitude": 27.99,
            "min_longitude": 86.91,
            "max_longitude": 86.93,
        },
        "resolution": 3,
    }
    response = client.post(
        "/api/v1/grid", data=json.dumps(test_data), content_type="application/json"
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "results" in data
    assert "width" in data
    assert "height" in data
    assert data["width"] == 3
    assert data["height"] == 3
    # Check that we have 3x3=9 points with reasonable elevation values
    assert len(data["results"]) == 9
    for result in data["results"]:
        assert result["elevation"] is not None
        assert 5000 < result["elevation"] < 9000  # Reasonable range for Everest


def test_grid_endpoint_invalid_json(client):
    """Test the /api/v1/grid endpoint with invalid JSON."""
    response = client.post("/api/v1/grid", data="not json", content_type="text/plain")
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data
    assert data["error"] == "Request must be JSON"


def test_grid_endpoint_missing_params(client):
    """Test the /api/v1/grid endpoint with missing parameters."""
    response = client.post(
        "/api/v1/grid", data=json.dumps({}), content_type="application/json"
    )
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data
    assert "Missing or invalid" in data["error"]


def test_grid_endpoint_invalid_bounds(client):
    """Test the /api/v1/grid endpoint with invalid bounds."""
    test_data = {
        "bounds": {
            "min_latitude": "not-a-number",
            "max_latitude": 27.99,
            "min_longitude": 86.91,
            "max_longitude": 86.95,
        },
        "resolution": 5,
    }
    response = client.post(
        "/api/v1/grid", data=json.dumps(test_data), content_type="application/json"
    )
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "error" in data
    assert "Invalid bounds" in data["error"]


@pytest.mark.skip(
    reason="Hard to test __main__ block reliably without proper module mocking"
)
def test_main_module_execution(app):
    """Test the __main__ block execution."""
    # Mock Flask's run method
    with patch("flask.Flask.run") as mock_run:
        # Execute the module with a mock __name__ to trigger the __main__ block
        original_name = __import__("app.app").__name__
        try:
            __import__("app.app").__name__ = "__main__"
            # This will reload the module and execute the __main__ block
            import importlib

            importlib.reload(__import__("app.app"))
            # Check if run was called with the expected arguments
            mock_run.assert_called_once()
        finally:
            # Restore the original name
            __import__("app.app").__name__ = original_name
