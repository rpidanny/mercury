export interface LatLon {
  lat: number;
  lon: number;
}

export interface ElevationResult {
  latitude: number;
  longitude: number;
  elevation: number | null;
}

export interface GridPoint extends LatLon {
  /** Optional index for triangulation / wall building */
  originalIndex?: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
  originalIndex?: number;
}

export interface LookupPoint {
  latitude: number;
  longitude: number;
}

export type ShapeType =
  | "hexagon"
  | "square"
  | "circle"
  | "rectangle"
  | "triangle";

export interface TerrainGridPoint extends GridPoint {
  elevation: number | null;
}

export interface TerrainTrackPoint extends LatLon {
  elevation: number | null;
}
