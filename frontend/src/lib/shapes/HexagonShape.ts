import { IShape } from "./IShape";
import { isPointInPolygon } from "../utils";
import { ShapeType } from "../types";

export default class HexagonShape implements IShape {
  /** Shape type */
  getType(): ShapeType {
    return "hexagon";
  }
  private radius: number;
  constructor(radius: number) {
    this.radius = radius;
  }
  getUnrotatedVertices(): { x: number; y: number }[] {
    const verts: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 6 + (i * Math.PI) / 3;
      verts.push({
        x: this.radius * Math.cos(angle),
        y: this.radius * Math.sin(angle),
      });
    }
    return verts;
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
