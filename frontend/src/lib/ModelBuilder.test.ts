import { describe, it, expect, vi } from "vitest";
import ModelBuilder from "./ModelBuilder";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TerrainData } from "./TerrainGenerator";
import { ShapeType } from "./types";
import * as THREE from "three";

describe("ModelBuilder", () => {
  // Create mock terrain data for testing
  const createMockTerrainData = (): TerrainData => {
    return {
      widthGeo: 0.01,
      boundsGeo: {
        minLat: 46.525,
        minLon: 6.63,
        maxLat: 46.535,
        maxLon: 6.64,
      },
      geoToXY: (lat: number, lon: number) => ({
        x: (lat - 46.53) * 100,
        y: (lon - 6.635) * 100,
      }),
      xyToGeo: (x: number, y: number) => ({
        lat: x / 100 + 46.53,
        lon: y / 100 + 6.635,
      }),
      gridPoints: [
        { lat: 46.525, lon: 6.63, elevation: 380, originalIndex: 0 },
        { lat: 46.525, lon: 6.635, elevation: 390, originalIndex: 1 },
        { lat: 46.525, lon: 6.64, elevation: 400, originalIndex: 2 },
        { lat: 46.53, lon: 6.63, elevation: 385, originalIndex: 3 },
        { lat: 46.53, lon: 6.635, elevation: 395, originalIndex: 4 },
        { lat: 46.53, lon: 6.64, elevation: 405, originalIndex: 5 },
        { lat: 46.535, lon: 6.63, elevation: 390, originalIndex: 6 },
        { lat: 46.535, lon: 6.635, elevation: 400, originalIndex: 7 },
        { lat: 46.535, lon: 6.64, elevation: 410, originalIndex: 8 },
      ],
      trackPoints: [
        { lat: 46.527, lon: 6.632, elevation: 383 },
        { lat: 46.529, lon: 6.635, elevation: 390 },
        { lat: 46.533, lon: 6.638, elevation: 402 },
      ],
    };
  };

  // Mock Font for testing
  const createMockFont = (): Font => {
    return {
      data: {},
      generateShapes: vi.fn(),
      familyName: "Test Font",
      resolution: 100,
      boundingBox: {
        max: new THREE.Vector2(1, 1),
        min: new THREE.Vector2(0, 0),
      },
      isFont: true,
    } as unknown as Font;
  };

  it("should build a model without text", () => {
    const mockTerrainData = createMockTerrainData();
    const modelWidthMM = 100;
    const altitudeMultiplier = 1;
    const shapeType: ShapeType = "circle";
    const embossText = "";
    const font = null;

    const result = ModelBuilder.build(
      mockTerrainData,
      modelWidthMM,
      altitudeMultiplier,
      shapeType,
      embossText,
      font
    );

    // Verify we get a result with a mesh and no text warning
    expect(result).toHaveProperty("mesh");
    expect(result).toHaveProperty("textOverlapWarning", false);

    // Verify the result contains a THREE.Group
    expect(result.mesh).toBeInstanceOf(THREE.Group);

    // Verify the group has children
    expect(result.mesh.children.length).toBeGreaterThan(0);

    // Check that all children are meshes
    result.mesh.children.forEach((child) => {
      expect(child).toBeInstanceOf(THREE.Mesh);
    });
  });

  it("should build a model with text", () => {
    const mockTerrainData = createMockTerrainData();
    const modelWidthMM = 100;
    const altitudeMultiplier = 1;
    const shapeType: ShapeType = "hexagon";
    const embossText = "TEST";
    const font = createMockFont();

    const result = ModelBuilder.build(
      mockTerrainData,
      modelWidthMM,
      altitudeMultiplier,
      shapeType,
      embossText,
      font
    );

    // Verify we get a result with a mesh
    expect(result).toHaveProperty("mesh");
    expect(result).toHaveProperty("textOverlapWarning");

    // Verify the result contains a THREE.Group
    expect(result.mesh).toBeInstanceOf(THREE.Group);

    // With text, we should have more meshes (including text platform and text mesh)
    expect(result.mesh.children.length).toBeGreaterThan(4);
  });

  it("should create different models with different parameters", () => {
    const mockTerrainData = createMockTerrainData();
    const modelWidthMM = 100;
    const altitudeMultiplier = 1;

    // Create two models with different shape types
    const circleResult = ModelBuilder.build(
      mockTerrainData,
      modelWidthMM,
      altitudeMultiplier,
      "circle",
      "",
      null
    );

    const hexagonResult = ModelBuilder.build(
      mockTerrainData,
      modelWidthMM,
      altitudeMultiplier,
      "hexagon",
      "",
      null
    );

    // Models should be different
    expect(circleResult.mesh).not.toBe(hexagonResult.mesh);

    // But both should be valid THREE.Group objects
    expect(circleResult.mesh).toBeInstanceOf(THREE.Group);
    expect(hexagonResult.mesh).toBeInstanceOf(THREE.Group);
  });

  it("should handle different terrain data scales", () => {
    // Create two identical data sets but with different widthGeo values
    const smallData = createMockTerrainData();
    smallData.widthGeo = 0.01;

    const largeData = createMockTerrainData();
    largeData.widthGeo = 0.1; // 10x larger geographic area

    // Use same model width for both
    const modelWidthMM = 100;
    const altitudeMultiplier = 1;
    const shapeType: ShapeType = "square";

    const smallResult = ModelBuilder.build(
      smallData,
      modelWidthMM,
      altitudeMultiplier,
      shapeType,
      "",
      null
    );

    const largeResult = ModelBuilder.build(
      largeData,
      modelWidthMM,
      altitudeMultiplier,
      shapeType,
      "",
      null
    );

    // Both models should be valid
    expect(smallResult.mesh).toBeInstanceOf(THREE.Group);
    expect(largeResult.mesh).toBeInstanceOf(THREE.Group);
    expect(smallResult.mesh.children.length).toBeGreaterThan(0);
    expect(largeResult.mesh.children.length).toBeGreaterThan(0);
  });
});
