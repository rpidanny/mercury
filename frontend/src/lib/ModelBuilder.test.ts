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

  it("should handle large terrain datasets without stack overflow", () => {
    // Create a large terrain dataset with thousands of points
    const largeTerrainData = createMockTerrainData();

    // Generate a large number of grid points (1,000,000+)
    const largeGridPoints = [];
    const gridSize = 1000; // 1000x1000 = 1,000,000 points
    const latStep =
      (largeTerrainData.boundsGeo.maxLat - largeTerrainData.boundsGeo.minLat) /
      gridSize;
    const lonStep =
      (largeTerrainData.boundsGeo.maxLon - largeTerrainData.boundsGeo.minLon) /
      gridSize;

    let index = 0;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const lat = largeTerrainData.boundsGeo.minLat + i * latStep;
        const lon = largeTerrainData.boundsGeo.minLon + j * lonStep;
        // Create varying elevations
        const elevation = 380 + Math.sin(i / 10) * 20 + Math.cos(j / 10) * 20;

        largeGridPoints.push({
          lat,
          lon,
          elevation,
          originalIndex: index++,
        });
      }
    }

    // Replace grid points with our large array
    largeTerrainData.gridPoints = largeGridPoints;

    // Test parameters
    const modelWidthMM = 100;
    const altitudeMultiplier = 1;
    const shapeType: ShapeType = "square";

    // This would previously cause stack overflow
    const result = ModelBuilder.build(
      largeTerrainData,
      modelWidthMM,
      altitudeMultiplier,
      shapeType,
      "",
      null
    );

    // Verify the model was created successfully
    expect(result).toHaveProperty("mesh");
    expect(result.mesh).toBeInstanceOf(THREE.Group);
    expect(result.mesh.children.length).toBeGreaterThan(0);

    // The test passing without an error is the main verification,
    // as it would previously throw a stack overflow error
  });

  it("should apply rotation to both shape and base geometry", () => {
    const mockTerrainData = createMockTerrainData();
    const modelWidthMM = 100;
    const altitudeMultiplier = 1;
    const shapeType: ShapeType = "square";
    const embossText = "";
    const font = null;

    // Create a model without rotation
    const modelWithoutRotation = ModelBuilder.build(
      mockTerrainData,
      modelWidthMM,
      altitudeMultiplier,
      shapeType,
      embossText,
      font,
      0 // No rotation
    );

    // Create a model with rotation
    const rotationAngle = 45; // 45 degrees rotation
    const modelWithRotation = ModelBuilder.build(
      mockTerrainData,
      modelWidthMM,
      altitudeMultiplier,
      shapeType,
      embossText,
      font,
      rotationAngle
    );

    // Verify both models were created successfully
    expect(modelWithoutRotation).toHaveProperty("mesh");
    expect(modelWithRotation).toHaveProperty("mesh");

    // Verify both are THREE.Group instances
    expect(modelWithoutRotation.mesh).toBeInstanceOf(THREE.Group);
    expect(modelWithRotation.mesh).toBeInstanceOf(THREE.Group);

    // Both should have the same number of children
    expect(modelWithoutRotation.mesh.children.length).toBe(
      modelWithRotation.mesh.children.length
    );

    // Access the base geometry (which should be child index 2 based on createMeshes function)
    const baseWithoutRotation = modelWithoutRotation.mesh
      .children[2] as THREE.Mesh;
    const baseWithRotation = modelWithRotation.mesh.children[2] as THREE.Mesh;

    // Verify the meshes are different (due to rotation)
    expect(baseWithoutRotation).not.toBe(baseWithRotation);

    // For a deeper check, we could verify the vertex positions are different
    // This requires getting the vertices from the geometry
    const baseWithoutRotationVertices = (
      baseWithoutRotation.geometry as THREE.BufferGeometry
    ).getAttribute("position").array;
    const baseWithRotationVertices = (
      baseWithRotation.geometry as THREE.BufferGeometry
    ).getAttribute("position").array;

    // At least some vertices should be different when rotated
    let isDifferent = false;
    for (let i = 0; i < baseWithoutRotationVertices.length; i += 3) {
      // Check x and y coordinates (ignoring z as rotation is in xy plane)
      if (
        Math.abs(baseWithoutRotationVertices[i] - baseWithRotationVertices[i]) >
          0.001 ||
        Math.abs(
          baseWithoutRotationVertices[i + 1] - baseWithRotationVertices[i + 1]
        ) > 0.001
      ) {
        isDifferent = true;
        break;
      }
    }

    expect(isDifferent).toBe(true);
  });
});
