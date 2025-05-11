from flask import Flask, jsonify, request

app = Flask(__name__)


@app.route("/api/elevation", methods=["GET"])
def get_elevation():
    # Placeholder for elevation data logic
    # In a real app, you would process GPX data and fetch/calculate elevation
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if not lat or not lon:
        return jsonify({"error": "Latitude and longitude are required"}), 400

    # Simulate returning elevation data
    elevation_data = {
        "latitude": float(lat),
        "longitude": float(lon),
        "elevation": 100.0,  # Example elevation
    }
    return jsonify(elevation_data)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
