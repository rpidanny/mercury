"""
Service for generating 3D models from elevation data and track points.
"""

from typing import List, Dict, Tuple, Any, Optional
import numpy as np
from io import BytesIO
import logging

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

        Returns:
            STL file data as bytes

        Raises:
            ValueError: If the elevation grid is invalid or track points are missing
        """
        # Validate inputs
        if not elevation_grid or len(elevation_grid) != width * height:
            raise ValueError("Invalid elevation grid")
        if not track_points:
            raise ValueError("Track points are required")

        # Reshape the grid data for easier processing
        # The elevation_grid is a flat list of [lat, lon, elevation] entries
        grid_array = np.array(elevation_grid)
        grid_lats = grid_array[:, 0].reshape(height, width)
        grid_lons = grid_array[:, 1].reshape(height, width)
        grid_elevs = grid_array[:, 2].reshape(height, width)

        # Calculate the scale based on the desired model width
        geo_width = np.max(grid_lons) - np.min(grid_lons)
        scale = model_width_mm / geo_width

        # Transform elevation grid into 3D coordinates
        min_elev = np.nanmin(grid_elevs)

        # Initialize the vertices array for the mesh
        vertices = []
        faces = []

        # Generate terrain surface vertices and faces
        terrain_vertices_count = 0

        for i in range(height):
            for j in range(width):
                # Get geographic coordinates
                lat = grid_lats[i, j]
                lon = grid_lons[i, j]
                elev = grid_elevs[i, j]

                if elev is None or np.isnan(elev):
                    elev = min_elev  # Use minimum elevation for missing values

                # Scale coordinates
                x = (lon - np.min(grid_lons)) * scale
                y = (lat - np.min(grid_lats)) * scale
                z = (elev - min_elev) * scale * altitude_multiplier

                vertices.append([x, y, z])

                # Add triangles (faces) for the terrain surface
                if i < height - 1 and j < width - 1:
                    # Two triangles per grid cell
                    v1 = i * width + j
                    v2 = i * width + (j + 1)
                    v3 = (i + 1) * width + j
                    v4 = (i + 1) * width + (j + 1)

                    # First triangle
                    faces.append([v1, v2, v3])
                    # Second triangle
                    faces.append([v2, v4, v3])

                    terrain_vertices_count += 4

        # Add base vertices and faces (bottom surface)
        base_z = -base_thickness_mm

        # Add bottom vertices for the base
        # We'll create a rectangular base using the corner points
        base_vertices = [
            [0, 0, base_z],  # Bottom left
            [model_width_mm, 0, base_z],  # Bottom right
            [0, model_width_mm * height / width, base_z],  # Top left
            [model_width_mm, model_width_mm * height / width, base_z],  # Top right
        ]

        base_vertex_start = len(vertices)
        vertices.extend(base_vertices)

        # Add base faces (two triangles)
        faces.append([base_vertex_start, base_vertex_start + 1, base_vertex_start + 2])
        faces.append(
            [base_vertex_start + 1, base_vertex_start + 3, base_vertex_start + 2]
        )

        # Add walls by connecting terrain perimeter to base
        # First, identify perimeter vertices in the terrain
        perimeter_indices = []

        # Add left and right edges
        for i in range(height):
            perimeter_indices.append(i * width)  # Left edge
            perimeter_indices.append(i * width + width - 1)  # Right edge

        # Add top and bottom edges (excluding corners already added)
        for j in range(1, width - 1):
            perimeter_indices.append(j)  # Top edge
            perimeter_indices.append((height - 1) * width + j)  # Bottom edge

        # Connect perimeter vertices to base with triangulated walls
        for i in range(len(perimeter_indices) - 1):
            v1 = perimeter_indices[i]
            v2 = perimeter_indices[i + 1]

            # Skip if the vertices are not adjacent
            dist = abs(v1 - v2)
            if dist != 1 and dist != width:
                continue

            # Calculate corresponding base vertices
            v1_pos = vertices[v1]
            v2_pos = vertices[v2]

            # Project to base
            b1 = len(vertices)
            b2 = len(vertices) + 1

            vertices.append([v1_pos[0], v1_pos[1], base_z])
            vertices.append([v2_pos[0], v2_pos[1], base_z])

            # Add two triangles for the wall segment
            faces.append([v1, v2, b1])
            faces.append([v2, b2, b1])

        # Process track points to create a raised path
        # Convert track points to model space
        track_vertices = []
        for i, point in enumerate(track_points):
            lat = point["latitude"]
            lon = point["longitude"]

            # Find the closest grid point and get its elevation
            elev = (
                track_elevations[i]
                if i < len(track_elevations) and track_elevations[i] is not None
                else min_elev
            )

            # Scale coordinates
            x = (lon - np.min(grid_lons)) * scale
            y = (lat - np.min(grid_lats)) * scale
            z = (elev - min_elev) * scale * altitude_multiplier + path_elevation_mm

            track_vertices.append([x, y, z])

        # Add simple path representation with connected cylinders
        # This is a simplified approach - for better results, use cylinder meshes
        if len(track_vertices) >= 2:
            for i in range(len(track_vertices) - 1):
                # Create a simplified path segment (just connect points for now)
                v1 = len(vertices)
                v2 = len(vertices) + 1

                vertices.append(track_vertices[i])
                vertices.append(track_vertices[i + 1])

                # Add tiny faces to represent the path
                # In a real implementation, this would be cylinder segments
                faces.append([v1, v2, base_vertex_start])  # Use any third point

        # Create the mesh
        stl_mesh = mesh.Mesh(np.zeros(len(faces), dtype=mesh.Mesh.dtype))

        # Set vertices for each face
        for i, face in enumerate(faces):
            for j in range(3):
                stl_mesh.vectors[i][j] = vertices[face[j]]

        # Write to BytesIO
        stl_io = BytesIO()
        stl_mesh.save(stl_io, mode=stl_mesh.ASCII)
        stl_io.seek(0)

        return stl_io.read()
