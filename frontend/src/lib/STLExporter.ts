import { Object3D, BufferGeometry, Mesh, Matrix4 } from "three";
import { STLExporter as ThreeSTLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface STLExportCallbacks {
  onCollectingGeometries?: () => Promise<void>;
  onProcessingOrientations?: () => Promise<void>;
  onCreatingManifold?: () => Promise<void>;
  onRemovingDegenerateTriangles?: () => Promise<void>;
  onGeneratingSTL?: () => Promise<void>;
}

export interface STLExportOptions {
  callbacks?: STLExportCallbacks;
}

export class STLExporter {
  private exporter: ThreeSTLExporter;

  constructor() {
    this.exporter = new ThreeSTLExporter();
  }

  /**
   * Creates a properly manifold mesh for 3D printing by rebuilding geometry connections
   */
  private async createPrintableMesh(
    group: Object3D,
    callbacks?: STLExportCallbacks
  ): Promise<BufferGeometry> {
    await callbacks?.onCollectingGeometries?.();

    const allVertices: number[] = [];
    const allIndices: number[] = [];
    let vertexOffset = 0;

    // Step 1: Collect and prepare all geometries with consistent orientation
    const processedGeometries: {
      positions: Float32Array;
      isBackSide: boolean;
    }[] = [];

    group.traverse((child) => {
      if (child instanceof Mesh && child.geometry) {
        const geometry = child.geometry.clone();

        // Apply world matrix transformations
        const worldMatrix = new Matrix4();
        child.updateWorldMatrix(true, false);
        worldMatrix.copy(child.matrixWorld);
        geometry.applyMatrix4(worldMatrix);

        // Convert to non-indexed geometry
        const nonIndexedGeo = geometry.index
          ? geometry.toNonIndexed()
          : geometry;

        // Check material orientation
        const material = (child as Mesh).material as THREE.MeshStandardMaterial;
        const isBackSide = material && material.side === THREE.BackSide;

        if (nonIndexedGeo.attributes.position) {
          processedGeometries.push({
            positions: nonIndexedGeo.attributes.position.array as Float32Array,
            isBackSide,
          });
        }
      }
    });

    await callbacks?.onProcessingOrientations?.();

    // Step 2: Process each geometry with consistent face orientation
    for (const { positions, isBackSide } of processedGeometries) {
      const numVertices = positions.length / 3;

      // Add vertices with consistent winding
      for (let i = 0; i < positions.length; i += 9) {
        if (isBackSide) {
          // Flip triangle winding for BackSide materials: v0, v2, v1
          allVertices.push(
            positions[i],
            positions[i + 1],
            positions[i + 2], // v0
            positions[i + 6],
            positions[i + 7],
            positions[i + 8], // v2 (was v1)
            positions[i + 3],
            positions[i + 4],
            positions[i + 5] // v1 (was v2)
          );
        } else {
          // Keep original winding for FrontSide materials: v0, v1, v2
          allVertices.push(
            positions[i],
            positions[i + 1],
            positions[i + 2], // v0
            positions[i + 3],
            positions[i + 4],
            positions[i + 5], // v1
            positions[i + 6],
            positions[i + 7],
            positions[i + 8] // v2
          );
        }
      }

      // Add indices for this geometry
      for (let i = 0; i < numVertices; i++) {
        allIndices.push(vertexOffset + i);
      }

      vertexOffset += numVertices;
    }

    if (allVertices.length === 0) {
      throw new Error("No valid geometries found to export");
    }

    return await this.createManifoldGeometry(
      allVertices,
      allIndices,
      callbacks
    );
  }

  /**
   * Creates a manifold geometry by merging vertices and removing degenerate triangles
   */
  private async createManifoldGeometry(
    vertices: number[],
    indices: number[],
    callbacks?: STLExportCallbacks
  ): Promise<BufferGeometry> {
    await callbacks?.onCreatingManifold?.();

    // Create geometry with merged vertices to eliminate duplicates
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setIndex(indices);

    // Merge duplicate vertices to create manifold edges
    const mergedGeometry = mergeVertices(geometry, 0.0001); // Small tolerance for floating point precision
    mergedGeometry.computeVertexNormals();

    // Remove degenerate triangles and create final clean geometry
    return await this.removeDegenearteTriangles(mergedGeometry, callbacks);
  }

  /**
   * Removes degenerate triangles (triangles with zero area)
   */
  private async removeDegenearteTriangles(
    geometry: BufferGeometry,
    callbacks?: STLExportCallbacks
  ): Promise<BufferGeometry> {
    await callbacks?.onRemovingDegenerateTriangles?.();

    const positions = geometry.attributes.position.array as Float32Array;
    const indices = geometry.index?.array;

    if (!indices) {
      throw new Error("Failed to create indexed geometry");
    }

    const validIndices: number[] = [];
    const EPSILON = 1e-10;

    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i] * 3;
      const i2 = indices[i + 1] * 3;
      const i3 = indices[i + 2] * 3;

      // Get triangle vertices
      const v1 = new THREE.Vector3(
        positions[i1],
        positions[i1 + 1],
        positions[i1 + 2]
      );
      const v2 = new THREE.Vector3(
        positions[i2],
        positions[i2 + 1],
        positions[i2 + 2]
      );
      const v3 = new THREE.Vector3(
        positions[i3],
        positions[i3 + 1],
        positions[i3 + 2]
      );

      // Calculate triangle area using cross product
      const edge1 = v2.clone().sub(v1);
      const edge2 = v3.clone().sub(v1);
      const cross = edge1.clone().cross(edge2);
      const area = cross.length() * 0.5;

      // Only include triangles with sufficient area
      if (area > EPSILON) {
        validIndices.push(indices[i], indices[i + 1], indices[i + 2]);
      }
    }

    // Create final clean geometry
    const cleanGeometry = new THREE.BufferGeometry();
    cleanGeometry.setAttribute("position", geometry.attributes.position);
    cleanGeometry.setIndex(validIndices);
    cleanGeometry.computeVertexNormals();

    console.log(
      `Export: Created manifold mesh with ${validIndices.length / 3} triangles`
    );
    return cleanGeometry;
  }

  /**
   * Converts a 3D model to STL format and returns the STL string
   */
  async generateSTL(
    mesh: Object3D,
    options?: STLExportOptions
  ): Promise<string> {
    const callbacks = options?.callbacks;

    // Create a printable mesh
    const printableGeometry = await this.createPrintableMesh(mesh, callbacks);
    const printableMesh = new THREE.Mesh(printableGeometry);

    await callbacks?.onGeneratingSTL?.();

    // Export to STL string
    return this.exporter.parse(printableMesh);
  }
}
