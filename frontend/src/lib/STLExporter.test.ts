import { describe, it, expect, vi, beforeEach } from "vitest";
import { STLExporter } from "./STLExporter";
import * as THREE from "three";

describe("STLExporter", () => {
  let stlExporter: STLExporter;

  beforeEach(() => {
    stlExporter = new STLExporter();
  });

  // Helper function to create a simple test mesh
  const createTestMesh = (): THREE.Object3D => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(geometry, material);

    const group = new THREE.Object3D();
    group.add(mesh);

    return group;
  };

  // Helper function to create a mesh with BackSide material
  const createBackSideMesh = (): THREE.Object3D => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ side: THREE.BackSide });
    const mesh = new THREE.Mesh(geometry, material);

    const group = new THREE.Object3D();
    group.add(mesh);

    return group;
  };

  // Helper function to create a complex mesh with multiple children
  const createComplexMesh = (): THREE.Object3D => {
    const group = new THREE.Object3D();

    // Add multiple geometries
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial()
    );
    box.position.set(0, 0, 0);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 6),
      new THREE.MeshStandardMaterial()
    );
    sphere.position.set(2, 0, 0);

    group.add(box);
    group.add(sphere);

    return group;
  };

  // Helper function to create an empty mesh group
  const createEmptyMesh = (): THREE.Object3D => {
    return new THREE.Object3D();
  };

  describe("generateSTL", () => {
    it("should generate STL string from a simple mesh", async () => {
      const mesh = createTestMesh();

      const stlString = await stlExporter.generateSTL(mesh);

      expect(stlString).toBeDefined();
      expect(typeof stlString).toBe("string");
      expect(stlString.length).toBeGreaterThan(0);
      expect(stlString).toContain("solid");
      expect(stlString).toContain("facet normal");
      expect(stlString).toContain("vertex");
      expect(stlString).toContain("endsolid");
    });

    it("should generate STL string from a complex mesh with multiple children", async () => {
      const mesh = createComplexMesh();

      const stlString = await stlExporter.generateSTL(mesh);

      expect(stlString).toBeDefined();
      expect(typeof stlString).toBe("string");
      expect(stlString.length).toBeGreaterThan(0);
      expect(stlString).toContain("solid");
      expect(stlString).toContain("endsolid");
    });

    it("should handle BackSide materials correctly", async () => {
      const mesh = createBackSideMesh();

      const stlString = await stlExporter.generateSTL(mesh);

      expect(stlString).toBeDefined();
      expect(typeof stlString).toBe("string");
      expect(stlString.length).toBeGreaterThan(0);
    });

    it("should throw error for empty mesh", async () => {
      const emptyMesh = createEmptyMesh();

      await expect(async () => {
        await stlExporter.generateSTL(emptyMesh);
      }).rejects.toThrow("No valid geometries found to export");
    });
  });

  describe("callbacks", () => {
    it("should call all callbacks in correct order", async () => {
      const mesh = createTestMesh();
      const callbacks = {
        onCollectingGeometries: vi.fn().mockResolvedValue(undefined),
        onProcessingOrientations: vi.fn().mockResolvedValue(undefined),
        onCreatingManifold: vi.fn().mockResolvedValue(undefined),
        onRemovingDegenerateTriangles: vi.fn().mockResolvedValue(undefined),
        onGeneratingSTL: vi.fn().mockResolvedValue(undefined),
      };

      const stlString = await stlExporter.generateSTL(mesh, { callbacks });

      expect(stlString).toBeDefined();
      expect(callbacks.onCollectingGeometries).toHaveBeenCalledTimes(1);
      expect(callbacks.onProcessingOrientations).toHaveBeenCalledTimes(1);
      expect(callbacks.onCreatingManifold).toHaveBeenCalledTimes(1);
      expect(callbacks.onRemovingDegenerateTriangles).toHaveBeenCalledTimes(1);
      expect(callbacks.onGeneratingSTL).toHaveBeenCalledTimes(1);

      // Verify call order - each callback should be called before the next one
      expect(callbacks.onCollectingGeometries).toHaveBeenCalledBefore(
        callbacks.onProcessingOrientations
      );
      expect(callbacks.onProcessingOrientations).toHaveBeenCalledBefore(
        callbacks.onCreatingManifold
      );
      expect(callbacks.onCreatingManifold).toHaveBeenCalledBefore(
        callbacks.onRemovingDegenerateTriangles
      );
      expect(callbacks.onRemovingDegenerateTriangles).toHaveBeenCalledBefore(
        callbacks.onGeneratingSTL
      );
    });

    it("should work without callbacks", async () => {
      const mesh = createTestMesh();

      await expect(async () => {
        const stlString = await stlExporter.generateSTL(mesh);
        expect(stlString).toBeDefined();
      }).not.toThrow();
    });

    it("should work with partial callbacks", async () => {
      const mesh = createTestMesh();
      const callbacks = {
        onCollectingGeometries: vi.fn().mockResolvedValue(undefined),
        onGeneratingSTL: vi.fn().mockResolvedValue(undefined),
        // Other callbacks intentionally omitted
      };

      const stlString = await stlExporter.generateSTL(mesh, { callbacks });

      expect(stlString).toBeDefined();
      expect(callbacks.onCollectingGeometries).toHaveBeenCalledTimes(1);
      expect(callbacks.onGeneratingSTL).toHaveBeenCalledTimes(1);
    });

    it("should handle callback errors gracefully", async () => {
      const mesh = createTestMesh();
      const callbacks = {
        onCollectingGeometries: vi
          .fn()
          .mockRejectedValue(new Error("Callback error")),
      };

      // The STL generation should propagate callback errors
      await expect(async () => {
        await stlExporter.generateSTL(mesh, { callbacks });
      }).rejects.toThrow("Callback error");
    });

    it("should handle async callbacks with delays", async () => {
      const mesh = createTestMesh();
      const callOrder: string[] = [];

      const callbacks = {
        onCollectingGeometries: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          callOrder.push("collecting");
        }),
        onProcessingOrientations: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          callOrder.push("processing");
        }),
        onCreatingManifold: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 15));
          callOrder.push("manifold");
        }),
        onRemovingDegenerateTriangles: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 8));
          callOrder.push("optimizing");
        }),
        onGeneratingSTL: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 3));
          callOrder.push("generating");
        }),
      };

      const stlString = await stlExporter.generateSTL(mesh, { callbacks });

      expect(stlString).toBeDefined();
      expect(callOrder).toEqual([
        "collecting",
        "processing",
        "manifold",
        "optimizing",
        "generating",
      ]);
      expect(callbacks.onCollectingGeometries).toHaveBeenCalledTimes(1);
      expect(callbacks.onProcessingOrientations).toHaveBeenCalledTimes(1);
      expect(callbacks.onCreatingManifold).toHaveBeenCalledTimes(1);
      expect(callbacks.onRemovingDegenerateTriangles).toHaveBeenCalledTimes(1);
      expect(callbacks.onGeneratingSTL).toHaveBeenCalledTimes(1);
    });
  });

  describe("mesh processing", () => {
    it("should handle meshes with transformations", async () => {
      const mesh = createTestMesh();

      // Apply transformations
      mesh.position.set(10, 20, 30);
      mesh.rotation.set(Math.PI / 4, Math.PI / 2, 0);
      mesh.scale.set(2, 0.5, 1.5);
      mesh.updateMatrix();

      const stlString = await stlExporter.generateSTL(mesh);

      expect(stlString).toBeDefined();
      expect(typeof stlString).toBe("string");
      expect(stlString.length).toBeGreaterThan(0);
    });

    it("should process indexed geometries correctly", async () => {
      const geometry = new THREE.SphereGeometry(1, 8, 6);
      const material = new THREE.MeshStandardMaterial();
      const mesh = new THREE.Mesh(geometry, material);

      const group = new THREE.Object3D();
      group.add(mesh);

      const stlString = await stlExporter.generateSTL(group);

      expect(stlString).toBeDefined();
      expect(typeof stlString).toBe("string");
      expect(stlString.length).toBeGreaterThan(0);
    });

    it("should process non-indexed geometries correctly", async () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
      const material = new THREE.MeshStandardMaterial();
      const mesh = new THREE.Mesh(geometry, material);

      const group = new THREE.Object3D();
      group.add(mesh);

      const stlString = await stlExporter.generateSTL(group);

      expect(stlString).toBeDefined();
      expect(typeof stlString).toBe("string");
      expect(stlString.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle mesh with no position attribute", async () => {
      const geometry = new THREE.BufferGeometry();
      // Intentionally not adding position attribute
      const material = new THREE.MeshStandardMaterial();
      const mesh = new THREE.Mesh(geometry, material);

      const group = new THREE.Object3D();
      group.add(mesh);

      await expect(async () => {
        await stlExporter.generateSTL(group);
      }).rejects.toThrow("No valid geometries found to export");
    });

    it("should handle deeply nested mesh hierarchy", async () => {
      const root = new THREE.Object3D();
      const level1 = new THREE.Object3D();
      const level2 = new THREE.Object3D();

      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial();
      const mesh = new THREE.Mesh(geometry, material);

      level2.add(mesh);
      level1.add(level2);
      root.add(level1);

      const stlString = await stlExporter.generateSTL(root);

      expect(stlString).toBeDefined();
      expect(typeof stlString).toBe("string");
      expect(stlString.length).toBeGreaterThan(0);
    });

    it("should handle mixed mesh types in group", async () => {
      const group = new THREE.Object3D();

      // Add a mesh
      const boxMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial()
      );

      // Add a non-mesh object that should be ignored
      const emptyObject = new THREE.Object3D();

      // Add another mesh with BackSide material
      const sphereMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 6),
        new THREE.MeshStandardMaterial({ side: THREE.BackSide })
      );

      group.add(boxMesh);
      group.add(emptyObject);
      group.add(sphereMesh);

      const stlString = await stlExporter.generateSTL(group);

      expect(stlString).toBeDefined();
      expect(typeof stlString).toBe("string");
      expect(stlString.length).toBeGreaterThan(0);
    });
  });

  describe("STL format validation", () => {
    it("should produce valid STL header and footer", async () => {
      const mesh = createTestMesh();
      const stlString = await stlExporter.generateSTL(mesh);

      const lines = stlString.trim().split("\n");
      expect(lines[0]).toMatch(/^solid/);
      expect(lines[lines.length - 1]).toMatch(/^endsolid/);
    });

    it("should contain proper facet structure", async () => {
      const mesh = createTestMesh();
      const stlString = await stlExporter.generateSTL(mesh);

      expect(stlString).toMatch(/facet normal/);
      expect(stlString).toMatch(/outer loop/);
      expect(stlString).toMatch(/vertex/);
      expect(stlString).toMatch(/endloop/);
      expect(stlString).toMatch(/endfacet/);
    });

    it("should have consistent vertex count per facet", async () => {
      const mesh = createTestMesh();
      const stlString = await stlExporter.generateSTL(mesh);

      // Count facets and vertices
      const facetMatches = stlString.match(/facet normal/g);
      const vertexMatches = stlString.match(/vertex/g);

      expect(facetMatches).toBeTruthy();
      expect(vertexMatches).toBeTruthy();

      if (facetMatches && vertexMatches) {
        // Each facet should have exactly 3 vertices
        expect(vertexMatches.length).toBe(facetMatches.length * 3);
      }
    });
  });
});
