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
    font: Font | null
  ): BuildResult {
    // 1. Setup
    const { widthGeo } = data;
    const scale = modelWidthMM / widthGeo;
    const shape = this.createShape(shapeType, widthGeo);

    // 2. Prepare data
    const scaledPoints = this.filterAndScalePoints(
      data,
      scale,
      altitudeMultiplier,
      shape
    );
    const trackPoints3D = this.createTrackPoints(
      data,
      scale,
      altitudeMultiplier
    );
    const delaunay = this.createDelaunay(scaledPoints);

    // 3. Terrain
    const terrainGeo = this.buildTerrainGeometry(scaledPoints, delaunay);
    terrainGeo.computeBoundingBox();
    const minZ = terrainGeo.boundingBox?.min.z ?? 0;
    const maxZ = terrainGeo.boundingBox?.max.z ?? 0;
    const baseZ = minZ - Config.BASE_THICKNESS_MM;

    // 4. Path
    const pathGeo = this.buildPathGeometry(trackPoints3D);

    // 5. Base & Walls
    const baseGeo = this.buildBaseGeometry(shape, scale, baseZ);
    const wallGeo = this.buildWallGeometry(scaledPoints, delaunay, baseZ);

    // 6. Text Platform & Emboss
    const { platformGeo, textGeo, textOverlapWarning } = this.buildTextEffects({
      embossText,
      font,
      shape,
      scale,
      trackPoints: trackPoints3D,
      terrainMaxZ: maxZ,
      baseZ,
    });

    // 7. Materials & Meshes
    const materials = this.createMaterials();
    const meshes = this.createMeshes(
      { terrainGeo, pathGeo, baseGeo, wallGeo, platformGeo, textGeo },
      materials,
      Boolean(embossText && font)
    );

    // 8. Group and Return
    const group = this.groupMeshes(meshes);
    return { mesh: group, textOverlapWarning };
  }

  private static filterAndScalePoints(
    data: TerrainData,
    scale: number,
    altitudeMultiplier: number,
    shape: IShape
  ): ScaledPoint[] {
    return data.gridPoints
      .filter((p: TerrainGridPoint) => {
        const { x, y } = data.geoToXY(p.lat, p.lon);
        return shape.contains({ x, y });
      })
      .map((p: TerrainGridPoint) => {
        const { x, y } = data.geoToXY(p.lat, p.lon);
        return {
          x: x * scale,
          y: y * scale,
          z: (p.elevation ?? 0) * altitudeMultiplier * scale,
          originalIndex: p.originalIndex!,
        };
      });
  }

  private static createTrackPoints(
    data: TerrainData,
    scale: number,
    altitudeMultiplier: number
  ): THREE.Vector3[] {
    return data.trackPoints.map((p: TerrainTrackPoint) => {
      const { x, y } = data.geoToXY(p.lat, p.lon);
      return new THREE.Vector3(
        x * scale,
        y * scale,
        (p.elevation ?? 0) * altitudeMultiplier * scale +
          Config.PATH_ELEVATION_MM
      );
    });
  }

  /**
   * Creates a Delaunay triangulation for a set of 2D points.
   */
  private static createDelaunay(
    points: ScaledPoint[]
  ): Delaunator<Float64Array> {
    // Create a Delaunay triangulation for 2D points (returns Float64Array coords)
    return Delaunator.from(points.map((pt) => [pt.x, pt.y]));
  }

  private static buildTerrainGeometry(
    points: ScaledPoint[],
    delaunay: Delaunator<Float64Array>
  ): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(Array.from(delaunay.triangles));
    const verts = points.flatMap(({ x, y, z }) => [x, y, z]);
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(verts, 3)
    );
    geometry.computeVertexNormals();
    return geometry;
  }

  private static buildPathGeometry(
    trackPoints: THREE.Vector3[]
  ): THREE.BufferGeometry {
    if (trackPoints.length < 2) {
      return new THREE.BufferGeometry();
    }
    const curve = new THREE.CatmullRomCurve3(trackPoints, false);
    return new THREE.TubeGeometry(
      curve,
      trackPoints.length * 5,
      Config.PATH_RADIUS_MM,
      16,
      false
    );
  }

  private static buildBaseGeometry(
    shape: IShape,
    scale: number,
    baseZ: number
  ): THREE.BufferGeometry {
    const bbox2d = shape.getBoundingBox();
    const geoW = bbox2d.maxX - bbox2d.minX;
    let geo: THREE.BufferGeometry;
    if (shape.getType() === "circle") {
      const radiusMM = (geoW * scale * Config.BASE_OVERLAP_FACTOR) / 2;
      const circle = new THREE.Shape();
      circle.absarc(0, 0, radiusMM, 0, Math.PI * 2, false);
      geo = new THREE.ShapeGeometry(circle);
    } else {
      const verts2D = shape
        .getVertices()
        .map(
          (v) =>
            new THREE.Vector2(
              v.x * scale * Config.BASE_OVERLAP_FACTOR,
              v.y * scale * Config.BASE_OVERLAP_FACTOR
            )
        );
      geo = new THREE.ShapeGeometry(new THREE.Shape(verts2D));
    }
    geo.translate(0, 0, baseZ);
    return geo;
  }

  private static buildWallGeometry(
    points: ScaledPoint[],
    delaunay: Delaunator<Float64Array>,
    baseZ: number
  ): THREE.BufferGeometry {
    // Extract hull vertices indices as an array of numbers
    const hull: number[] = Array.from(delaunay.hull);
    const boundaryIdx = hull
      .map((i) => points[i]?.originalIndex)
      .filter((i) => i !== undefined) as number[];
    const wallVerts: number[] = [];
    const wallIdx: number[] = [];
    boundaryIdx.forEach((orig, i) => {
      const next = boundaryIdx[(i + 1) % boundaryIdx.length];
      const p1 = points.find((pt) => pt.originalIndex === orig);
      const p2 = points.find((pt) => pt.originalIndex === next);
      if (!p1 || !p2) return;
      const v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
      const v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
      const b1 = new THREE.Vector3(p1.x, p1.y, baseZ);
      const b2 = new THREE.Vector3(p2.x, p2.y, baseZ);
      const baseIndex = wallVerts.length / 3;
      wallVerts.push(
        ...v1.toArray(),
        ...b1.toArray(),
        ...b2.toArray(),
        ...v2.toArray()
      );
      wallIdx.push(
        baseIndex,
        baseIndex + 1,
        baseIndex + 2,
        baseIndex,
        baseIndex + 2,
        baseIndex + 3
      );
    });
    const geo = new THREE.BufferGeometry();
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

  private static buildTextEffects(options: {
    embossText: string;
    font: Font | null;
    shape: IShape;
    scale: number;
    trackPoints: THREE.Vector3[];
    terrainMaxZ: number;
    baseZ: number;
  }): {
    platformGeo: THREE.BufferGeometry;
    textGeo: THREE.BufferGeometry;
    textOverlapWarning: boolean;
  } {
    const { embossText, font, shape, scale, trackPoints, terrainMaxZ, baseZ } =
      options;

    let platformGeo = new THREE.BufferGeometry();
    let textGeo = new THREE.BufferGeometry();
    let textOverlapWarning = false;

    if (embossText && font) {
      const bbox2d = shape.getBoundingBox();
      const hexRadius = bbox2d.maxX * scale * Config.BASE_OVERLAP_FACTOR;
      const margin = hexRadius * Config.TEXT_PLATFORM_MARGIN_FACTOR;
      const pWidth = Math.max(1, hexRadius * Config.TEXT_PLATFORM_WIDTH_FACTOR);
      const pDepth = Math.max(1, hexRadius * Config.TEXT_PLATFORM_DEPTH_FACTOR);
      const height = terrainMaxZ + Config.TEXT_PLATFORM_HEIGHT_OFFSET - baseZ;
      const yCenter = -hexRadius + margin + pDepth / 2;

      // Overlap check
      const minX = -pWidth / 2 - Config.TEXT_PATH_BUFFER;
      const maxX = pWidth / 2 + Config.TEXT_PATH_BUFFER;
      const minY = yCenter - pDepth / 2 - Config.TEXT_PATH_BUFFER;
      const maxY = yCenter + pDepth / 2 + Config.TEXT_PATH_BUFFER;
      textOverlapWarning = trackPoints.some(
        (pt) => pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY
      );

      // Platform
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
      platformGeo.translate(0, yCenter, baseZ);

      // Text
      textGeo = new TextGeometry(embossText, {
        font,
        size: pWidth * Config.TEXT_SIZE_FACTOR,
        depth: Config.TEXT_EMBOSS_DEPTH,
        curveSegments: 4,
      });
      textGeo.computeBoundingBox();
    }

    return { platformGeo, textGeo, textOverlapWarning };
  }

  private static createMaterials() {
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

  private static createMeshes(
    geos: {
      terrainGeo: THREE.BufferGeometry;
      pathGeo: THREE.BufferGeometry;
      baseGeo: THREE.BufferGeometry;
      wallGeo: THREE.BufferGeometry;
      platformGeo: THREE.BufferGeometry;
      textGeo: THREE.BufferGeometry;
    },
    mats: ReturnType<typeof ModelBuilder.createMaterials>,
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

  static createShape(shapeType: ShapeType, widthGeo: number): IShape {
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

  static groupMeshes(meshes: THREE.Object3D[]): THREE.Group {
    const group = new THREE.Group();
    meshes.forEach((m) => group.add(m));
    return group;
  }
}
