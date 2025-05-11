import { IShape } from "./IShape";
import { isPointInPolygon } from "../utils";
import { ShapeType } from "../types";

export default class SquareShape implements IShape {
  /** Shape type */
  getType(): ShapeType {
    return "square";
  }
  private side: number;
  constructor(side: number) {
    this.side = side;
  }
  getUnrotatedVertices(): { x: number; y: number }[] {
    const half = this.side / 2;
    return [
      { x: -half, y: -half },
      { x: half, y: -half },
      { x: half, y: half },
      { x: -half, y: half },
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
