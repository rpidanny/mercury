# Mercury 🚀

Mercury is a tool that turns your GPX route files into stunning 3D visualizations of the surrounding terrain, ready for 3D printing. Whether you're into running, hiking, cycling, or any outdoor activity, Mercury brings your routes to life with a bird’s-eye view of the land you traverse—and lets you print them out in 3D!

## Usage

### Get terrain data

- Download **GeoTIFF** files from [here](https://portal.opentopography.org/raster?opentopoID=OTALOS.112016.4326.2).
- Extract the files to the `data` directory.
- Build virtual raster file from the GeoTIFF files.

```bash
$ gdalbuildvrt data/geo_AW3D30.vrt data/netherlands_AW3D30.tif data/nepal_AW3D30.tif
```

### Run the application

```bash
docker compose up
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
