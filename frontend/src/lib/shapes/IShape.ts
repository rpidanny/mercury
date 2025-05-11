import { ShapeType } from "../types";

export interface IShape {
  /** Shape type */
  getType(): ShapeType;
  /** Unrotated vertices in XY space */
  getUnrotatedVertices(): { x: number; y: number }[];
  /** Rotated or processed vertices */
  getVertices(): { x: number; y: number }[];
  /** Check if a point is inside the shape */
  contains(point: { x: number; y: number }): boolean;
  /** Get bounding box in XY space */
  getBoundingBox(): { minX: number; maxX: number; minY: number; maxY: number };
}
