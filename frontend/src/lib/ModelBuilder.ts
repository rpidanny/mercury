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
    rotationAngle: number = 0,
    lowPolyMode: boolean = false,
    textPlatformHeightOverride?: number
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
        rotationAngle,
        lowPolyMode,
        textPlatformHeightOverride
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
  private lowPolyMode = false;

  private constructor() {}

  private buildModel(
    data: TerrainData,
    modelWidthMM: number,
    altitudeMultiplier: number,
    shapeType: ShapeType,
    embossText: string,
    font: Font | null,
    rotationAngle: number = 0,
    lowPolyMode: boolean = false,
    textPlatformHeightOverride?: number
  ): BuildResult {
    // Store parameters
    this.data = data;
    this.scale = modelWidthMM / data.widthGeo;
    this.altitudeMultiplier = altitudeMultiplier;
    this.rotationAngle = rotationAngle;
    this.lowPolyMode = lowPolyMode;

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
      font,
      textPlatformHeightOverride
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

    // Only simplify points if Low Poly Mode is enabled
    if (this.lowPolyMode) {
      this.simplifyPoints();
    }

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

  /**
   * Simplifies the point set by using a grid-based approach to reduce the number of points
   * while preserving terrain features.
   */
  private simplifyPoints(): void {
    if (this.scaledPoints.length <= 1) return;

    console.log(
      `Low Poly Mode: reducing from ${this.scaledPoints.length} points`
    );

    // Find bounds
    let minX = this.scaledPoints[0].x;
    let maxX = this.scaledPoints[0].x;
    let minY = this.scaledPoints[0].y;
    let maxY = this.scaledPoints[0].y;

    for (const pt of this.scaledPoints) {
      minX = Math.min(minX, pt.x);
      maxX = Math.max(maxX, pt.x);
      minY = Math.min(minY, pt.y);
      maxY = Math.max(maxY, pt.y);
    }

    // Calculate grid dimensions - aim for target number of cells
    const targetCells = Math.min(
      Config.SIMPLIFY_TARGET_POINTS,
      this.scaledPoints.length / 3
    );

    const gridWidth = maxX - minX;
    const gridHeight = maxY - minY;
    const aspectRatio = gridWidth / gridHeight;
    const gridCols = Math.floor(Math.sqrt(targetCells * aspectRatio));
    const gridRows = Math.floor(targetCells / gridCols);

    const cellWidth = gridWidth / gridCols;
    const cellHeight = gridHeight / gridRows;

    // Create grid buckets
    const grid: Map<string, ScaledPoint[]> = new Map();

    // Place points in grid buckets
    for (const pt of this.scaledPoints) {
      const col = Math.floor((pt.x - minX) / cellWidth);
      const row = Math.floor((pt.y - minY) / cellHeight);
      const key = `${col},${row}`;

      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(pt);
    }

    // For each non-empty cell, pick representative point
    // Prefer points that are elevational extremes
    const simplified: ScaledPoint[] = [];

    for (const [, points] of grid) {
      if (points.length === 0) continue;
      if (points.length === 1) {
        simplified.push(points[0]);
        continue;
      }

      // Find min, max, and middle elevation points in this cell
      let minZPoint = points[0];
      let maxZPoint = points[0];

      for (const pt of points) {
        if (pt.z < minZPoint.z) minZPoint = pt;
        if (pt.z > maxZPoint.z) maxZPoint = pt;
      }

      // Always keep extremes if they differ significantly
      const zDiff = maxZPoint.z - minZPoint.z;
      const zThreshold = 1.0;

      if (zDiff > zThreshold) {
        simplified.push(minZPoint);
        simplified.push(maxZPoint);
      } else {
        // For flat areas, just keep one point
        simplified.push(points[0]);
      }
    }

    console.log(`Simplified to ${simplified.length} points`);
    this.scaledPoints = simplified;
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

    // For efficiency with large models, limit the number of track points only in low poly mode
    let trackPoints = this.data.trackPoints;

    if (this.lowPolyMode && trackPoints.length > Config.MAX_TRACK_POINTS) {
      // Subsample track points
      const step = Math.ceil(trackPoints.length / Config.MAX_TRACK_POINTS);
      trackPoints = trackPoints.filter(
        (_, i) => i % step === 0 || i === trackPoints.length - 1
      );
    }

    // Create delaunay for grid points to use in interpolation
    const gridDelaunay = Delaunator.from(
      this.scaledPoints.map((pt) => [pt.x, pt.y])
    );

    return trackPoints.map((p: TerrainTrackPoint) => {
      const { x, y } = this.data!.geoToXY(p.lat, p.lon);
      const scaledX = x * this.scale;
      const scaledY = y * this.scale;

      // Find containing triangle for interpolation
      // In low poly mode, skip interpolation for some track points to save CPU
      const shouldInterpolate = !this.lowPolyMode || Math.random() > 0.5;
      const containingTriangle = shouldInterpolate
        ? this.findContainingTriangle(scaledX, scaledY, gridDelaunay)
        : null;

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

    // Calculate appropriate segments based on number of points and low poly mode
    const segmentMultiplier = this.lowPolyMode
      ? 1
      : this.trackPoints3D.length > 100
      ? 2
      : 5;

    const segments = Math.min(
      this.lowPolyMode ? 200 : 500,
      this.trackPoints3D.length * segmentMultiplier
    );

    // Create a tube geometry around the curve with adaptive detail
    const tubularSegments = Math.min(segments, this.lowPolyMode ? 150 : 300);

    const radialSegments = this.lowPolyMode
      ? Config.LOW_DETAIL_RADIAL_SEGMENTS
      : this.trackPoints3D.length > 200
      ? Config.LOW_DETAIL_RADIAL_SEGMENTS
      : Config.HIGH_DETAIL_RADIAL_SEGMENTS;

    return new THREE.TubeGeometry(
      curve,
      tubularSegments,
      Config.PATH_RADIUS_MM,
      radialSegments,
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

    // Apply rotation if needed
    if (this.rotationAngle !== 0) {
      geo.applyMatrix4(this.rotationMatrix);
    }

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
    font: Font | null,
    textPlatformHeightOverride?: number
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
        textPlatformHeightOverride !== undefined
          ? textPlatformHeightOverride
          : this.terrainMaxZ + Config.TEXT_PLATFORM_HEIGHT_OFFSET - this.baseZ;
      const yCenter = -hexRadius + margin + pDepth / 2;

      // Check for overlap with path
      const minX = -pWidth / 2 - Config.TEXT_PATH_BUFFER;
      const maxX = pWidth / 2 + Config.TEXT_PATH_BUFFER;
      const minY = yCenter - pDepth / 2 - Config.TEXT_PATH_BUFFER;
      const maxY = yCenter + pDepth / 2 + Config.TEXT_PATH_BUFFER;

      // Check for overlap with path
      const hasPathOverlap = this.trackPoints3D.some(
        (pt) => pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY
      );

      if (hasPathOverlap) {
        textOverlapWarning = true;
        console.warn(
          `WARNING: Text "${embossText}" overlaps with path. Consider different text placement.`
        );
      }

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

      // Create text geometry with adaptive detail based on model size and low poly mode
      const curveSegments = this.lowPolyMode
        ? Config.LOW_DETAIL_CURVE_SEGMENTS
        : this.scaledPoints.length > 5000
        ? Config.LOW_DETAIL_CURVE_SEGMENTS
        : Config.HIGH_DETAIL_CURVE_SEGMENTS;

      // Start with proportional text size
      let textSize = pWidth * Config.TEXT_SIZE_FACTOR;

      // Create initial text geometry to measure dimensions
      textGeo = new TextGeometry(embossText, {
        font,
        size: textSize,
        depth: Config.TEXT_EMBOSS_DEPTH,
        curveSegments: curveSegments,
      });
      textGeo.computeBoundingBox();

      // Define platform constraints with margins
      const platformMarginX = 0.05; // 5% margin on each side
      const platformMarginY = 0.1; // 10% margin top/bottom
      const maxTextWidth = pWidth * (1 - 2 * platformMarginX);
      const maxTextHeight = pDepth * (1 - 2 * platformMarginY);

      if (textGeo.boundingBox) {
        const textWidth = textGeo.boundingBox.max.x - textGeo.boundingBox.min.x;
        const textHeight =
          textGeo.boundingBox.max.y - textGeo.boundingBox.min.y;

        // Calculate scale factors needed to fit within platform
        const widthScale =
          textWidth > maxTextWidth ? maxTextWidth / textWidth : 1;
        const heightScale =
          textHeight > maxTextHeight ? maxTextHeight / textHeight : 1;
        const scale = Math.min(widthScale, heightScale);

        // Apply scaling if needed
        if (scale < 1) {
          const originalSize = textSize;
          textSize = textSize * scale;

          // Set warning flag when text needs to be scaled down
          textOverlapWarning = true;

          console.warn(
            `WARNING: Text "${embossText}" scaled from ${originalSize.toFixed(
              1
            )}mm to ${textSize.toFixed(1)}mm to fit platform (${pWidth.toFixed(
              1
            )}mm × ${pDepth.toFixed(
              1
            )}mm). Consider shorter text or larger model.`
          );

          // Recreate geometry with fitted size
          textGeo = new TextGeometry(embossText, {
            font,
            size: textSize,
            depth: Config.TEXT_EMBOSS_DEPTH,
            curveSegments: curveSegments,
          });
          textGeo.computeBoundingBox();
        }
      }

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

    // Clean up and free memory
    this.scaledPoints = [];
    this.trackPoints3D = [];
    this.delaunay = null;

    return group;
  }
}
