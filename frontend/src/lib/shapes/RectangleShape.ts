import { IShape } from "./IShape";
import { isPointInPolygon } from "../utils";
import { ShapeType } from "../types";

export default class RectangleShape implements IShape {
  private width: number;
  private height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  getType(): ShapeType {
    return "rectangle";
  }
  getUnrotatedVertices(): { x: number; y: number }[] {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    return [
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
      { x: halfW, y: halfH },
      { x: -halfW, y: halfH },
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
