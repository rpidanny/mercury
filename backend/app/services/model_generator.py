"""
Service for generating 3D models from elevation data and track points.
"""

from typing import List, Dict, Tuple, Any, Optional
import numpy as np
from io import BytesIO
import logging
import gc
import time
import os
import sys
import math

# For STL generation
try:
    from stl import mesh
except ImportError:
    logging.error(
        "numpy-stl package not installed. Please install with: pip install numpy-stl"
    )
    raise


class ModelGenerator:
    """
    Service for generating 3D terrain models with embedded track paths.

    This class provides methods to convert elevation grid data and track points
    into a 3D model and export it as an STL file.
    """

    @staticmethod
    def generate_stl(
        elevation_grid: List[List[Any]],
        track_points: List[Dict[str, float]],
        track_elevations: List[float],
        width: int,
        height: int,
        base_thickness_mm: float = 2.0,
        model_width_mm: float = 100.0,
        altitude_multiplier: float = 1.0,
        path_elevation_mm: float = 0.5,
        path_radius_mm: float = 0.5,
        logger=None,
    ) -> bytes:
        """
        Generate an STL file from elevation grid and track points.

        Args:
            elevation_grid: Grid of points with [lat, lon, elevation]
            track_points: List of track points with latitude and longitude
            track_elevations: List of elevations for each track point
            width: Width of the grid
            height: Height of the grid
            base_thickness_mm: Thickness of the base in mm
            model_width_mm: Width of the output model in mm
            altitude_multiplier: Multiplier for elevation values
            path_elevation_mm: Elevation offset for the track path
            path_radius_mm: Radius of the track path
            logger: Optional logger instance

        Returns:
            STL file data as bytes

        Raises:
            ValueError: If the elevation grid is invalid or track points are missing
        """
        # Set up default logger if none provided
        if logger is None:
            logger = logging.getLogger(__name__)

        start_time = time.time()
        logger.info(
            f"Starting STL generation: grid size {width}x{height}, track points: {len(track_points)}"
        )

        # Log memory usage
        logger.debug(
            f"Initial memory usage: {ModelGenerator._get_memory_usage_mb()} MB"
        )

        # Validate inputs
        if not elevation_grid or len(elevation_grid) != width * height:
            raise ValueError("Invalid elevation grid")
        if not track_points:
            raise ValueError("Track points are required")

        # Extract necessary data from elevation grid more efficiently
        try:
            logger.debug("Extracting elevation data...")
            data_extract_start = time.time()

            # Pre-calculate min values to reduce repeated calculations
            lats = np.array([point[0] for point in elevation_grid])
            lons = np.array([point[1] for point in elevation_grid])
            elevs = np.array(
                [
                    point[2] if point[2] is not None else -9999
                    for point in elevation_grid
                ]
            )

            logger.debug(
                f"Data arrays created: lats={lats.shape}, lons={lons.shape}, elevs={elevs.shape}"
            )

            # Calculate bounds once
            min_lon = np.min(lons)
            min_lat = np.min(lats)
            max_lon = np.max(lons)
            max_lat = np.max(lats)
            min_elev = np.min(elevs[elevs > -9000])  # Filter out nodata values
            max_elev = np.max(elevs[elevs > -9000])

            # Calculate geographic width and height
            geo_width = max_lon - min_lon
            geo_height = max_lat - min_lat

            # Calculate the center latitude for scale correction
            center_lat = (min_lat + max_lat) / 2

            logger.debug(
                f"Geographic bounds: lat=[{min_lat:.6f}, {max_lat:.6f}], lon=[{min_lon:.6f}, {max_lon:.6f}]"
            )
            logger.debug(f"Elevation range: [{min_elev:.2f}, {max_elev:.2f}]")
            logger.debug(f"Center latitude: {center_lat:.6f}")

            # Free memory
            del lons, lats
            gc.collect()

            # Calculate x scale (longitude)
            x_scale = model_width_mm / geo_width

            # Correct y scale (latitude) based on the center latitude to maintain proper aspect ratio
            # At the equator, 1 degree of latitude = 1 degree of longitude in distance
            # As we move toward poles, longitude degrees become smaller in actual distance
            longitude_scale_factor = math.cos(math.radians(abs(center_lat)))
            y_scale = x_scale / longitude_scale_factor

            # Scale model height to keep the aspect ratio
            model_height_mm = geo_height * y_scale

            logger.debug(
                f"Calculated scales: x_scale={x_scale:.6f}, y_scale={y_scale:.6f}"
            )
            logger.debug(
                f"Model dimensions: width={model_width_mm:.1f}mm, height={model_height_mm:.1f}mm"
            )

            # Calculate elevation range and scale the vertical dimension
            elev_range = max_elev - min_elev
            if elev_range > 0:
                # Make the vertical scale proportional to the horizontal scale
                # Default is using 10% of the model width as the max elevation
                z_scale_factor = 0.1 * model_width_mm / elev_range
                # Apply the user's altitude multiplier to this base scale
                z_scale = z_scale_factor * altitude_multiplier
            else:
                # Default for flat terrain (no elevation range)
                z_scale = 1.0 * altitude_multiplier

            logger.debug(f"Elevation range: {elev_range:.2f}, z_scale: {z_scale:.6f}")

            logger.debug(
                f"Extracted elevation data in {time.time() - data_extract_start:.2f}s"
            )
            logger.debug(
                f"Memory usage after data extraction: {ModelGenerator._get_memory_usage_mb()} MB"
            )
        except Exception as e:
            logger.error(f"Error processing elevation data: {e}")
            raise ValueError(f"Error processing elevation data: {e}")

        # Reshape elevation data for processing
        try:
            logger.debug("Reshaping grid data...")
            reshape_start = time.time()

            grid_array = np.array(elevation_grid)
            grid_lats = grid_array[:, 0].reshape(height, width)
            grid_lons = grid_array[:, 1].reshape(height, width)
            grid_elevs = grid_array[:, 2].reshape(height, width)

            logger.debug(
                f"Grid shapes: lats={grid_lats.shape}, lons={grid_lons.shape}, elevs={grid_elevs.shape}"
            )

            # Free memory
            del grid_array
            gc.collect()

            logger.debug(f"Reshaped grid data in {time.time() - reshape_start:.2f}s")
            logger.debug(
                f"Memory usage after reshaping: {ModelGenerator._get_memory_usage_mb()} MB"
            )
        except Exception as e:
            logger.error(f"Error reshaping grid data: {e}")
            raise ValueError(f"Error reshaping grid data: {e}")

        # Build mesh in chunks to reduce memory usage
        try:
            logger.debug("Building mesh vertices and faces...")
            mesh_build_start = time.time()

            vertices = []
            faces = []

            # Process terrain in chunks
            chunk_size = min(20, height)  # Process 20 rows at a time max
            logger.debug(f"Processing terrain in chunks of {chunk_size} rows")

            vertex_index = 0
            for chunk_index, chunk_start in enumerate(range(0, height, chunk_size)):
                chunk_process_start = time.time()
                chunk_end = min(chunk_start + chunk_size, height)
                chunk_height = chunk_end - chunk_start

                logger.debug(
                    f"Processing chunk {chunk_index+1}/{(height+chunk_size-1)//chunk_size}: rows {chunk_start}-{chunk_end-1}"
                )

                # Process this chunk of the terrain
                vertex_count_before = len(vertices)
                faces_count_before = len(faces)

                for i in range(chunk_start, chunk_end):
                    rel_i = i - chunk_start  # Relative position in the chunk

                    for j in range(width):
                        # Get geographic coordinates
                        lat = grid_lats[i, j]
                        lon = grid_lons[i, j]
                        elev = grid_elevs[i, j]

                        if elev is None or np.isnan(elev):
                            elev = min_elev  # Use minimum elevation for missing values

                        # Scale coordinates with corrected scales
                        x = (lon - min_lon) * x_scale
                        y = (lat - min_lat) * y_scale
                        z = (elev - min_elev) * z_scale

                        vertices.append([x, y, z])

                        # Add triangles (faces) for the terrain surface
                        # Only create faces if we have the necessary vertices
                        if i < height - 1 and j < width - 1:
                            v1 = vertex_index
                            v2 = vertex_index + 1
                            v3 = vertex_index + width
                            v4 = vertex_index + width + 1

                            # First triangle
                            faces.append([v1, v2, v3])
                            # Second triangle
                            faces.append([v2, v4, v3])

                        vertex_index += 1

                logger.debug(
                    f"Chunk {chunk_index+1} added {len(vertices)-vertex_count_before} vertices and {len(faces)-faces_count_before} faces in {time.time()-chunk_process_start:.2f}s"
                )

                # Log every few chunks to avoid excessive logging
                if chunk_index % 5 == 0 or chunk_end == height:
                    logger.debug(
                        f"Progress: {chunk_end}/{height} rows processed, {len(vertices)} vertices, {len(faces)} faces"
                    )
                    logger.debug(
                        f"Memory usage: {ModelGenerator._get_memory_usage_mb()} MB"
                    )

            # Free memory
            del grid_lats, grid_lons, grid_elevs
            gc.collect()

            logger.debug(
                f"Built terrain mesh with {len(vertices)} vertices and {len(faces)} faces in {time.time() - mesh_build_start:.2f}s"
            )
            logger.debug(
                f"Memory usage after terrain mesh: {ModelGenerator._get_memory_usage_mb()} MB"
            )

        except Exception as e:
            logger.error(f"Error generating terrain mesh: {e}")
            raise ValueError(f"Error generating terrain mesh: {e}")

        # Add base at a simplified level of detail
        try:
            logger.debug("Adding base...")
            base_start = time.time()

            base_z = -base_thickness_mm
            logger.debug(f"Base z-level: {base_z:.2f}mm")

            # Add bottom vertices for the base - just use 4 corners for simplicity
            base_vertices = [
                [0, 0, base_z],  # Bottom left
                [model_width_mm, 0, base_z],  # Bottom right
                [0, model_height_mm, base_z],  # Top left
                [model_width_mm, model_height_mm, base_z],  # Top right
            ]

            base_vertex_start = len(vertices)
            vertices.extend(base_vertices)

            # Add base faces (two triangles)
            faces.append(
                [base_vertex_start, base_vertex_start + 1, base_vertex_start + 2]
            )
            faces.append(
                [base_vertex_start + 1, base_vertex_start + 3, base_vertex_start + 2]
            )

            logger.debug(f"Added base in {time.time() - base_start:.2f}s")
        except Exception as e:
            logger.error(f"Error generating base: {e}")
            raise ValueError(f"Error generating base: {e}")

        # Add simplified walls - just connect the perimeter
        try:
            logger.debug("Adding walls...")
            walls_start = time.time()

            # Only use the corners and a few points in between for walls
            perimeter_points = []

            # Get corner indices
            top_left = 0
            top_right = width - 1
            bottom_left = (height - 1) * width
            bottom_right = height * width - 1

            # Add corners
            perimeter_points.append(top_left)
            perimeter_points.append(top_right)
            perimeter_points.append(bottom_right)
            perimeter_points.append(bottom_left)

            logger.debug(f"Using {len(perimeter_points)} perimeter points for walls")

            # Connect the perimeter points with walls
            walls_vertex_count_before = len(vertices)
            walls_faces_count_before = len(faces)

            for i in range(len(perimeter_points)):
                v1 = perimeter_points[i]
                v2 = perimeter_points[(i + 1) % len(perimeter_points)]

                # Get positions
                v1_pos = vertices[v1]
                v2_pos = vertices[v2]

                # Add base vertices
                b1 = len(vertices)
                b2 = len(vertices) + 1

                vertices.append([v1_pos[0], v1_pos[1], base_z])
                vertices.append([v2_pos[0], v2_pos[1], base_z])

                # Add two triangles for the wall segment
                faces.append([v1, v2, b1])
                faces.append([v2, b2, b1])

            logger.debug(
                f"Added {len(vertices)-walls_vertex_count_before} vertices and {len(faces)-walls_faces_count_before} faces for walls in {time.time()-walls_start:.2f}s"
            )
        except Exception as e:
            logger.error(f"Error generating walls: {e}")
            raise ValueError(f"Error generating walls: {e}")

        # Process track points to create a simplified path
        try:
            logger.debug("Processing track points...")
            track_start = time.time()

            if len(track_points) >= 2:
                # Sample the track to reduce complexity
                max_track_points = 200
                stride = max(1, len(track_points) // max_track_points)
                sampled_track = [
                    track_points[i] for i in range(0, len(track_points), stride)
                ]
                sampled_elevations = [
                    track_elevations[i] if i < len(track_elevations) else None
                    for i in range(0, len(track_points), stride)
                ]

                logger.debug(
                    f"Sampled track points from {len(track_points)} to {len(sampled_track)} points (stride={stride})"
                )

                # Process sampled track points
                track_vertices = []
                for i, point in enumerate(sampled_track):
                    lat = point["latitude"]
                    lon = point["longitude"]

                    # Get elevation
                    elev = (
                        sampled_elevations[i]
                        if i < len(sampled_elevations)
                        and sampled_elevations[i] is not None
                        else min_elev
                    )

                    # Scale coordinates with corrected scales
                    x = (lon - min_lon) * x_scale
                    y = (lat - min_lat) * y_scale
                    z = (elev - min_elev) * z_scale + path_elevation_mm

                    track_vertices.append([x, y, z])

                # Create path segments
                track_vertex_count_before = len(vertices)
                track_faces_count_before = len(faces)

                for i in range(len(track_vertices) - 1):
                    v1 = len(vertices)
                    v2 = len(vertices) + 1

                    vertices.append(track_vertices[i])
                    vertices.append(track_vertices[i + 1])

                    # Add a simple face to represent the path
                    faces.append([v1, v2, base_vertex_start])

                logger.debug(
                    f"Added {len(vertices)-track_vertex_count_before} vertices and {len(faces)-track_faces_count_before} faces for track in {time.time()-track_start:.2f}s"
                )

                # Free memory
                del track_vertices
                gc.collect()
            else:
                logger.debug("Not enough track points to create path")
        except Exception as e:
            logger.error(f"Error generating path: {e}")
            raise ValueError(f"Error generating path: {e}")

        # Create the mesh
        try:
            logger.debug("Creating final STL mesh...")
            stl_start = time.time()

            # Create numpy array for faces and vertices
            data = np.zeros(len(faces), dtype=mesh.Mesh.dtype)
            logger.debug(f"Created mesh data array with {len(faces)} faces")

            # Create mesh
            stl_mesh = mesh.Mesh(data)

            # Set vertices for each face
            logger.debug("Setting face vertices...")
            vertices_start = time.time()
            for i, face in enumerate(faces):
                for j in range(3):
                    stl_mesh.vectors[i][j] = vertices[face[j]]

            logger.debug(f"Set all vertices in {time.time() - vertices_start:.2f}s")

            # Write to a temporary file and read back
            logger.debug("Writing STL to temporary file...")
            import tempfile

            with tempfile.NamedTemporaryFile(suffix=".stl", delete=True) as tmp:
                tmp_path = tmp.name
                logger.debug(f"Using temporary file: {tmp_path}")

                stl_mesh.save(tmp_path)
                file_size = os.path.getsize(tmp_path)
                logger.debug(f"STL file saved, size: {file_size/1024:.1f}KB")

                tmp.seek(0)
                stl_data = tmp.read()
                logger.debug(f"Read {len(stl_data)} bytes from temporary file")

            logger.debug(f"STL mesh created in {time.time() - stl_start:.2f}s")
            logger.debug(f"Total STL generation time: {time.time() - start_time:.2f}s")

            return stl_data

        except Exception as e:
            logger.error(f"Error generating STL file: {e}")
            raise ValueError(f"Error generating STL file: {e}")

    @staticmethod
    def _get_memory_usage_mb():
        """Get current memory usage in MB"""
        try:
            import psutil

            process = psutil.Process(os.getpid())
            return process.memory_info().rss / 1024 / 1024
        except ImportError:
            # psutil not available
            return 0
