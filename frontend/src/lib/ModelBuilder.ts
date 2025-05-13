import * as THREE from "three";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";
import Delaunator from "delaunator";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

import Config from "./config";
import { TerrainGridPoint, TerrainTrackPoint, ShapeType } from "./types";
import { TerrainData } from "./TerrainGenerator";
import { IShape } from "./shapes/IShape";
import HexagonShape from "./shapes/HexagonShape";
import SquareShape from "./shapes/SquareShape";
import CircleShape from "./shapes/CircleShape";

export interface BuildResult {
  mesh: THREE.Object3D;
  textOverlapWarning: boolean;
}

interface ScaledPoint {
  x: number;
  y: number;
  z: number;
  originalIndex: number;
}

export default class ModelBuilder {
  /**
   * Builds the final mesh combining terrain, path, base, walls, and optional text embossing.
   */
  static build(
    data: TerrainData,
    modelWidthMM: number,
    altitudeMultiplier: number,
    shapeType: ShapeType,
    embossText: string,
    font: Font | null,
    rotationAngle: number = 0
  ): BuildResult {
    const builder = new ModelBuilder();

    try {
      return builder.buildModel(
        data,
        modelWidthMM,
        altitudeMultiplier,
        shapeType,
        embossText,
        font,
        rotationAngle
      );
    } catch (error) {
      console.error("Error building model:", error);
      throw error;
    }
  }

  private scaledPoints: ScaledPoint[] = [];
  private trackPoints3D: THREE.Vector3[] = [];
  private delaunay: Delaunator<Float64Array> | null = null;
  private terrainMinZ = 0;
  private terrainMaxZ = 0;
  private baseZ = 0;
  private shape: IShape | null = null;
  private scale = 1;
  private data: TerrainData | null = null;
  private altitudeMultiplier = 1;
  private rotationAngle = 0;
  private rotationMatrix = new THREE.Matrix4();
  private rotationMatrixInverse = new THREE.Matrix4();

  private constructor() {}

  private buildModel(
    data: TerrainData,
    modelWidthMM: number,
    altitudeMultiplier: number,
    shapeType: ShapeType,
    embossText: string,
    font: Font | null,
    rotationAngle: number = 0
  ): BuildResult {
    // Store parameters
    this.data = data;
    this.scale = modelWidthMM / data.widthGeo;
    this.altitudeMultiplier = altitudeMultiplier;
    this.rotationAngle = rotationAngle;

    // Create rotation matrices
    if (rotationAngle !== 0) {
      const angleInRadians = (rotationAngle * Math.PI) / 180;
      this.rotationMatrix.makeRotationZ(angleInRadians);
      this.rotationMatrixInverse.copy(this.rotationMatrix).invert();
    }

    // 1. Create shape and prepare data
    this.shape = this.createShape(shapeType);
    this.preparePoints();

    // 2. Build all geometries
    const terrainGeo = this.buildTerrainGeometry();
    const pathGeo = this.buildPathGeometry();
    const baseGeo = this.buildBaseGeometry();
    const wallGeo = this.buildWallGeometry();

    // 3. Handle text effects
    const hasText = Boolean(embossText && font);
    const { platformGeo, textGeo, textOverlapWarning } = this.buildTextEffects(
      embossText,
      font
    );

    // 4. Create materials and meshes
    const materials = this.createMaterials();
    const meshes = this.createMeshes(
      { terrainGeo, pathGeo, baseGeo, wallGeo, platformGeo, textGeo },
      materials,
      hasText
    );

    // 5. Group meshes (no rotation applied here anymore)
    const group = this.groupMeshes(meshes);

    return { mesh: group, textOverlapWarning };
  }

  /**
   * Rotates a 2D point {x,y} in the opposite direction of the current rotation angle
   */
  private unrotatePoint(point: { x: number; y: number }): {
    x: number;
    y: number;
  } {
    if (this.rotationAngle === 0) return point;

    const vec = new THREE.Vector3(point.x, point.y, 0);
    vec.applyMatrix4(this.rotationMatrixInverse);

    return { x: vec.x, y: vec.y };
  }

  private preparePoints(): void {
    if (!this.shape || !this.data) {
      throw new Error("Shape and data must be set before preparing points");
    }

    // Filter and scale grid points
    this.scaledPoints = this.filterAndScalePoints();

    // Create track points
    this.trackPoints3D = this.createTrackPoints();

    // Create delaunay triangulation
    this.delaunay = Delaunator.from(
      this.scaledPoints.map((pt) => [pt.x, pt.y])
    );

    // Calculate z-range for the terrain
    const zValues = this.scaledPoints.map((p) => p.z);
    // Use a loop instead of spread operator to avoid stack overflow with large arrays
    this.terrainMinZ = zValues.length > 0 ? zValues[0] : 0;
    this.terrainMaxZ = zValues.length > 0 ? zValues[0] : 0;

    for (let i = 1; i < zValues.length; i++) {
      if (zValues[i] < this.terrainMinZ) this.terrainMinZ = zValues[i];
      if (zValues[i] > this.terrainMaxZ) this.terrainMaxZ = zValues[i];
    }

    this.baseZ = this.terrainMinZ - Config.BASE_THICKNESS_MM;
  }

  private filterAndScalePoints(): ScaledPoint[] {
    if (!this.shape || !this.data) {
      throw new Error("Shape and data must be set before filtering points");
    }

    return this.data.gridPoints
      .filter((p: TerrainGridPoint) => {
        const { x, y } = this.data!.geoToXY(p.lat, p.lon);
        // Unrotate the point to check if it falls within the unrotated shape
        const unrotatedPoint = this.unrotatePoint({ x, y });
        return this.shape!.contains(unrotatedPoint);
      })
      .map((p: TerrainGridPoint) => {
        const { x, y } = this.data!.geoToXY(p.lat, p.lon);
        // Scale the points but don't rotate them yet
        return {
          x: x * this.scale,
          y: y * this.scale,
          z: (p.elevation ?? 0) * this.altitudeMultiplier * this.scale,
          originalIndex: p.originalIndex!,
        };
      });
  }

  private createTrackPoints(): THREE.Vector3[] {
    if (!this.data) {
      throw new Error("Data must be set before creating track points");
    }

    // Create delaunay for grid points to use in interpolation
    const gridDelaunay = Delaunator.from(
      this.scaledPoints.map((pt) => [pt.x, pt.y])
    );

    return this.data.trackPoints.map((p: TerrainTrackPoint) => {
      const { x, y } = this.data!.geoToXY(p.lat, p.lon);
      const scaledX = x * this.scale;
      const scaledY = y * this.scale;

      // Find containing triangle for interpolation
      const containingTriangle = this.findContainingTriangle(
        scaledX,
        scaledY,
        gridDelaunay
      );

      // Calculate z value using interpolation or point's elevation
      let scaledZ = (p.elevation ?? 0) * this.altitudeMultiplier * this.scale;
      if (containingTriangle) {
        scaledZ = this.interpolateElevation(
          scaledX,
          scaledY,
          containingTriangle
        );
      }

      // Add a small offset to ensure the path is visible above terrain
      return new THREE.Vector3(
        scaledX,
        scaledY,
        scaledZ + Config.PATH_ELEVATION_MM
      );
    });
  }

  private findContainingTriangle(
    x: number,
    y: number,
    delaunay: Delaunator<Float64Array>
  ): [number, number, number] | null {
    // Check each triangle in the delaunay triangulation
    for (let i = 0; i < delaunay.triangles.length; i += 3) {
      const a = delaunay.triangles[i];
      const b = delaunay.triangles[i + 1];
      const c = delaunay.triangles[i + 2];

      // Get triangle vertex coordinates
      const ax = this.scaledPoints[a].x;
      const ay = this.scaledPoints[a].y;
      const bx = this.scaledPoints[b].x;
      const by = this.scaledPoints[b].y;
      const cx = this.scaledPoints[c].x;
      const cy = this.scaledPoints[c].y;

      // Calculate determinant for barycentric coordinates
      const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(d) < 1e-10) continue; // Skip degenerate triangles

      // Calculate barycentric coordinates
      const wa = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d;
      const wb = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
      const wc = 1 - wa - wb;

      // If point is inside triangle
      if (wa >= 0 && wb >= 0 && wc >= 0) {
        return [a, b, c];
      }
    }

    return null; // Point not in any triangle
  }

  private interpolateElevation(
    x: number,
    y: number,
    triangle: [number, number, number]
  ): number {
    const [a, b, c] = triangle;

    // Get triangle vertex coordinates and z-values
    const ax = this.scaledPoints[a].x;
    const ay = this.scaledPoints[a].y;
    const az = this.scaledPoints[a].z;

    const bx = this.scaledPoints[b].x;
    const by = this.scaledPoints[b].y;
    const bz = this.scaledPoints[b].z;

    const cx = this.scaledPoints[c].x;
    const cy = this.scaledPoints[c].y;
    const cz = this.scaledPoints[c].z;

    // Calculate barycentric coordinates
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    const wa = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d;
    const wb = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
    const wc = 1 - wa - wb;

    // Interpolate z-value using barycentric coordinates
    return wa * az + wb * bz + wc * cz;
  }

  private buildTerrainGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    if (!this.delaunay) {
      throw new Error("Delaunay triangulation must be created first");
    }

    // Set triangle indices
    geometry.setIndex(Array.from(this.delaunay.triangles));

    // Set vertex positions
    const verts = this.scaledPoints.flatMap(({ x, y, z }) => [x, y, z]);
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(verts, 3)
    );

    geometry.computeVertexNormals();
    return geometry;
  }

  private buildPathGeometry(): THREE.BufferGeometry {
    // Return empty geometry if insufficient track points
    if (this.trackPoints3D.length < 2) {
      return new THREE.BufferGeometry();
    }

    // Create a smooth curve through the track points
    const curve = new THREE.CatmullRomCurve3(this.trackPoints3D, false);

    // Create a tube geometry around the curve
    return new THREE.TubeGeometry(
      curve,
      this.trackPoints3D.length * 5, // Curve segments
      Config.PATH_RADIUS_MM, // Tube radius
      16, // Radial segments
      false // Closed
    );
  }

  private buildBaseGeometry(): THREE.BufferGeometry {
    if (!this.shape) {
      throw new Error("Shape must be created before building base geometry");
    }

    const bbox2d = this.shape.getBoundingBox();
    const geoW = bbox2d.maxX - bbox2d.minX;
    let geo: THREE.BufferGeometry;

    // Handle circle shape differently
    if (this.shape.getType() === "circle") {
      const radiusMM = (geoW * this.scale * Config.BASE_OVERLAP_FACTOR) / 2;
      const circle = new THREE.Shape();
      circle.absarc(0, 0, radiusMM, 0, Math.PI * 2, false);
      geo = new THREE.ShapeGeometry(circle);
    } else {
      // For other shapes, use their vertices
      const verts2D = this.shape.getVertices().map((v) => {
        // Scale the vertices
        const scaled = new THREE.Vector2(
          v.x * this.scale * Config.BASE_OVERLAP_FACTOR,
          v.y * this.scale * Config.BASE_OVERLAP_FACTOR
        );
        return scaled;
      });
      geo = new THREE.ShapeGeometry(new THREE.Shape(verts2D));
    }

    // Move base to correct z position
    geo.translate(0, 0, this.baseZ);
    return geo;
  }

  private buildWallGeometry(): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();

    if (!this.delaunay) {
      return geo;
    }

    // Extract hull vertices indices
    const hull: number[] = Array.from(this.delaunay.hull);
    const boundaryIdx = hull
      .map((i) => this.scaledPoints[i]?.originalIndex)
      .filter((i) => i !== undefined) as number[];

    if (boundaryIdx.length === 0) {
      return geo;
    }

    // Create index mapping for fast lookup
    const indexMap = new Map<number, ScaledPoint>();
    this.scaledPoints.forEach((point) => {
      indexMap.set(point.originalIndex, point);
    });

    const wallVerts: number[] = [];
    const wallIdx: number[] = [];

    // Build wall triangles by connecting each pair of boundary points
    boundaryIdx.forEach((orig, i) => {
      const next = boundaryIdx[(i + 1) % boundaryIdx.length];
      const p1 = indexMap.get(orig);
      const p2 = indexMap.get(next);

      if (!p1 || !p2) return;

      // Create top and bottom vertices for the wall segment
      const v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
      const v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
      const b1 = new THREE.Vector3(p1.x, p1.y, this.baseZ);
      const b2 = new THREE.Vector3(p2.x, p2.y, this.baseZ);

      const baseIndex = wallVerts.length / 3;

      // Add the vertices
      wallVerts.push(
        ...v1.toArray(),
        ...b1.toArray(),
        ...b2.toArray(),
        ...v2.toArray()
      );

      // Add triangle indices (two triangles per wall segment)
      wallIdx.push(
        baseIndex,
        baseIndex + 1,
        baseIndex + 2,
        baseIndex,
        baseIndex + 2,
        baseIndex + 3
      );
    });

    if (wallVerts.length > 0) {
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(wallVerts, 3)
      );
      geo.setIndex(wallIdx);
      geo.computeVertexNormals();
    }

    return geo;
  }

  private buildTextEffects(
    embossText: string,
    font: Font | null
  ): {
    platformGeo: THREE.BufferGeometry;
    textGeo: THREE.BufferGeometry;
    textOverlapWarning: boolean;
  } {
    let platformGeo = new THREE.BufferGeometry();
    let textGeo = new THREE.BufferGeometry();
    let textOverlapWarning = false;

    // Only process text if both text and font are provided
    if (embossText && font && this.shape) {
      const bbox2d = this.shape.getBoundingBox();
      const hexRadius = bbox2d.maxX * this.scale * Config.BASE_OVERLAP_FACTOR;

      // Calculate platform dimensions
      const margin = hexRadius * Config.TEXT_PLATFORM_MARGIN_FACTOR;
      const pWidth = Math.max(1, hexRadius * Config.TEXT_PLATFORM_WIDTH_FACTOR);
      const pDepth = Math.max(1, hexRadius * Config.TEXT_PLATFORM_DEPTH_FACTOR);
      const height =
        this.terrainMaxZ + Config.TEXT_PLATFORM_HEIGHT_OFFSET - this.baseZ;
      const yCenter = -hexRadius + margin + pDepth / 2;

      // Check for overlap with path
      const minX = -pWidth / 2 - Config.TEXT_PATH_BUFFER;
      const maxX = pWidth / 2 + Config.TEXT_PATH_BUFFER;
      const minY = yCenter - pDepth / 2 - Config.TEXT_PATH_BUFFER;
      const maxY = yCenter + pDepth / 2 + Config.TEXT_PATH_BUFFER;

      textOverlapWarning = this.trackPoints3D.some(
        (pt) => pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY
      );

      // Create platform geometry
      const ps = new THREE.Shape();
      ps.moveTo(-pWidth / 2, -pDepth / 2);
      ps.lineTo(pWidth / 2, -pDepth / 2);
      ps.lineTo(pWidth / 2, pDepth / 2);
      ps.lineTo(-pWidth / 2, pDepth / 2);
      ps.closePath();

      platformGeo = new THREE.ExtrudeGeometry(ps, {
        depth: height,
        bevelEnabled: false,
      });
      platformGeo.translate(0, yCenter, this.baseZ + 2);

      // Create text geometry
      textGeo = new TextGeometry(embossText, {
        font,
        size: pWidth * Config.TEXT_SIZE_FACTOR,
        depth: Config.TEXT_EMBOSS_DEPTH,
        curveSegments: 4,
      });
      textGeo.computeBoundingBox();

      // Center and position the text on top of the platform
      if (textGeo.boundingBox) {
        const textWidth = textGeo.boundingBox.max.x - textGeo.boundingBox.min.x;
        const textHeight =
          textGeo.boundingBox.max.y - textGeo.boundingBox.min.y;

        // Center horizontally
        textGeo.translate(-textWidth / 2, 0, 0);

        // Position on top of platform
        textGeo.translate(
          0,
          yCenter - textHeight / 2,
          this.baseZ + 2 + height // +2 to offset the platform offset
        );
      }
    }

    return { platformGeo, textGeo, textOverlapWarning };
  }

  private createMaterials() {
    const palette = [
      0x1f77b4, 0xff7f0e, 0x2ca02c, 0xd62728, 0x9467bd, 0x8c564b, 0xe377c2,
      0x7f7f7f, 0xbcbd22, 0x17becf,
    ];

    return {
      terrain: new THREE.MeshStandardMaterial({
        color: palette[7],
        side: THREE.BackSide,
        metalness: 0.3,
        roughness: 0.6,
        flatShading: true,
      }),
      path: new THREE.MeshStandardMaterial({
        color: palette[3],
        side: THREE.FrontSide,
        metalness: 0.3,
        roughness: 0.4,
        flatShading: true,
      }),
      base: new THREE.MeshStandardMaterial({
        color: palette[7],
        side: THREE.BackSide,
        metalness: 0.1,
        roughness: 0.8,
        flatShading: true,
      }),
      wall: new THREE.MeshStandardMaterial({
        color: palette[7],
        side: THREE.BackSide,
        metalness: 0.1,
        roughness: 0.9,
        flatShading: true,
      }),
      text: new THREE.MeshStandardMaterial({
        color: palette[7],
        side: THREE.FrontSide,
        metalness: 0.1,
        roughness: 0.8,
        flatShading: true,
      }),
      textPlatform: new THREE.MeshStandardMaterial({
        color: palette[3],
        side: THREE.FrontSide,
        metalness: 0.1,
        roughness: 0.8,
        flatShading: true,
      }),
    };
  }

  private createMeshes(
    geos: {
      terrainGeo: THREE.BufferGeometry;
      pathGeo: THREE.BufferGeometry;
      baseGeo: THREE.BufferGeometry;
      wallGeo: THREE.BufferGeometry;
      platformGeo: THREE.BufferGeometry;
      textGeo: THREE.BufferGeometry;
    },
    mats: ReturnType<typeof ModelBuilder.prototype.createMaterials>,
    includeText: boolean
  ): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [
      new THREE.Mesh(geos.terrainGeo, mats.terrain),
      new THREE.Mesh(geos.pathGeo, mats.path),
      new THREE.Mesh(geos.baseGeo, mats.base),
      new THREE.Mesh(geos.wallGeo, mats.wall),
    ];

    if (includeText) {
      meshes.push(
        new THREE.Mesh(geos.platformGeo, mats.textPlatform),
        new THREE.Mesh(geos.textGeo, mats.text)
      );
    }

    return meshes;
  }

  private createShape(shapeType: ShapeType): IShape {
    if (!this.data) {
      throw new Error("Data must be set before creating shape");
    }

    const widthGeo = this.data.widthGeo;

    switch (shapeType) {
      case "hexagon":
        return new HexagonShape(widthGeo / Math.sqrt(3));
      case "square":
        return new SquareShape(widthGeo);
      case "circle":
        return new CircleShape(widthGeo / 2);
      default:
        return new SquareShape(widthGeo);
    }
  }

  private groupMeshes(meshes: THREE.Object3D[]): THREE.Group {
    const group = new THREE.Group();
    meshes.forEach((m) => group.add(m));
    return group;
  }
}
