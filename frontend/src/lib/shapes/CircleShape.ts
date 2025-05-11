import { IShape } from "./IShape";
import { ShapeType } from "../types";

export default class CircleShape implements IShape {
  private radius: number;
  constructor(radius: number) {
    this.radius = radius;
  }
  getType(): ShapeType {
    return "circle";
  }
  getUnrotatedVertices(): { x: number; y: number }[] {
    return [];
  }
  getVertices(): { x: number; y: number }[] {
    return this.getUnrotatedVertices();
  }
  contains(point: { x: number; y: number }): boolean {
    return point.x * point.x + point.y * point.y <= this.radius * this.radius;
  }
  getBoundingBox(): { minX: number; maxX: number; minY: number; maxY: number } {
    return {
      minX: -this.radius,
      maxX: this.radius,
      minY: -this.radius,
      maxY: this.radius,
    };
  }
}
