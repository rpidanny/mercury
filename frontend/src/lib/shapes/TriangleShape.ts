import { IShape } from "./IShape";
import { isPointInPolygon } from "../utils";
import { ShapeType } from "../types";

export default class TriangleShape implements IShape {
  /** Shape type */
  getType(): ShapeType {
    return "triangle";
  }
  private side: number;
  constructor(side: number) {
    this.side = side;
  }
  getUnrotatedVertices(): { x: number; y: number }[] {
    const s = this.side;
    const h = (s * Math.sqrt(3)) / 2;
    return [
      { x: 0, y: (2 * h) / 3 },
      { x: -s / 2, y: -h / 3 },
      { x: s / 2, y: -h / 3 },
    ];
  }
  getVertices(): { x: number; y: number }[] {
    return this.getUnrotatedVertices();
  }
  contains(point: { x: number; y: number }): boolean {
    return isPointInPolygon(point, this.getUnrotatedVertices());
  }
  getBoundingBox(): { minX: number; maxX: number; minY: number; maxY: number } {
    const verts = this.getUnrotatedVertices();
    const xs = verts.map((v) => v.x);
    const ys = verts.map((v) => v.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }
}
