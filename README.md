# Mercury

Mercury transforms your GPX route files into stunning 3D visualizations of the surrounding terrain, ready for 3D printing. Whether you're an avid runner, hiker, cyclist, or outdoor enthusiast, Mercury brings your adventures to life with a beautiful bird's-eye view of the terrain you've traversed.

<div align="center">
  <em>Turn your adventures into physical mementos you can hold in your hand!</em>
</div>

## ✨ Features

- **GPX Route Visualization** - Upload your GPX files from Strava, Garmin, and other activity trackers
- **Multiple Shape Options** - Choose from hexagons, squares, or circles for your terrain model
- **Customizable Parameters** - Adjust model width, altitude scaling, grid resolution, and padding
- **Text Embossing** - Add custom text to your 3D model (e.g., date, distance, elevation gain)
- **3D Preview** - Preview your model in the browser before 3D printing
- **STL Export** - Download STL files ready for 3D printing

## 🛠️ Installation

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [GDAL](https://gdal.org/) (for initial terrain data preparation)

### Setup Terrain Data

1. Download **GeoTIFF** terrain files from [OpenTopography](https://portal.opentopography.org/raster?opentopoID=OTALOS.112016.4326.2).
2. Place the downloaded files in the `data` directory.
3. Create a virtual raster file from your GeoTIFF files:

```bash
# Example for combining Netherlands and Nepal terrain data
gdalbuildvrt data/geo_AW3D30.vrt data/netherlands_AW3D30.tif data/nepal_AW3D30.tif
```

> 💡 **Tip:** Download terrain files for the regions where your activities take place.

## 🚀 Usage

### Start the Application

```bash
# Start both frontend and backend services
docker compose up
```

Once running, access the application at [http://localhost:5173](http://localhost:5173).

### Creating a 3D Model

1. Upload your GPX file
2. Select your desired shape (hexagon, square, or circle)
3. Adjust model parameters:
   - Width (mm) - Physical size of your 3D print
   - Altitude Multiplier - Exaggerate or reduce height differences
   - Grid Resolution - Detail level of terrain (higher = more detailed)
   - Padding Factor - Amount of terrain surrounding your route
4. Add optional embossed text
5. Click "Generate 3D Terrain"
6. Preview your 3D model and download the STL file

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
