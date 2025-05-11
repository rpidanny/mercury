import json
import pytest
from app.routes.lookup import get_elevations


def test_lookup_endpoint_coordinates_out_of_range(client):
    """Test the /api/v1/lookup endpoint with coordinates out of valid range."""
    test_data = {
        "locations": [
            {"latitude": 100.0, "longitude": 139.6917},  # Invalid latitude
            {"latitude": 40.7128, "longitude": 200.0},  # Invalid longitude
        ]
    }
    response = client.post(
        "/api/v1/lookup", data=json.dumps(test_data), content_type="application/json"
    )
    assert response.status_code == 200
    data = json.loads(response.data)
    assert "results" in data
    # Both entries should be skipped due to invalid coordinates
    assert len(data["results"]) == 0
