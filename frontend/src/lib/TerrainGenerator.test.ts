import { describe, it, expect, vi, beforeEach } from "vitest";
import TerrainGenerator from "./TerrainGenerator";
import ElevationService from "./ElevationService";
import type { LatLon } from "./types";
import Config from "./config";

// Mock the ElevationService methods
vi.mock("./ElevationService", () => ({
  default: {
    fetchGridElevations: vi.fn(),
    fetchElevations: vi.fn(),
  },
}));

describe("TerrainGenerator", () => {
  // Grab the mocked functions
  const mockGrid = vi.mocked(ElevationService.fetchGridElevations);
  const mockFetch = vi.mocked(ElevationService.fetchElevations);

  beforeEach(() => {
    mockGrid.mockReset();
    mockFetch.mockReset();
  });

  it("throws if fewer than two track points are provided", async () => {
    await expect(
      TerrainGenerator.generate([{ lat: 0, lon: 0 }], 1, 1)
    ).rejects.toThrow("Need at least 2 track points to generate terrain.");
  });

  it("generates terrain data and returns correct projections and points", async () => {
    const trackPoints: LatLon[] = [
      { lat: 0, lon: 0 },
      { lat: 1, lon: 1 },
    ];

    // Prepare dummy service responses
    const gridResults = [{ latitude: 0, longitude: 0, elevation: 10 }];
    const trackResults = [
      { latitude: 0, longitude: 0, elevation: 5 },
      { latitude: 1, longitude: 1, elevation: 6 },
    ];
    mockGrid.mockResolvedValue({ results: gridResults, width: 1, height: 1 });
    mockFetch.mockResolvedValue(trackResults);

    const data = await TerrainGenerator.generate(trackPoints, 1, 1);

    // Verify gridPoints mapping
    expect(data.gridPoints).toEqual([
      { lat: 0, lon: 0, elevation: 10, originalIndex: 0 },
    ]);

    // Verify trackPoints mapping
    expect(data.trackPoints).toEqual([
      { lat: 0, lon: 0, elevation: 5 },
      { lat: 1, lon: 1, elevation: 6 },
    ]);

    // Test that geoToXY and xyToGeo are inverses for a sample point
    const testLat = 0.5;
    const testLon = 0.5;
    const { x, y } = data.geoToXY(testLat, testLon);
    const { lat, lon } = data.xyToGeo(x, y);
    expect(lat).toBeCloseTo(testLat);
    expect(lon).toBeCloseTo(testLon);

    // Verify that service methods were called correctly
    expect(mockGrid).toHaveBeenCalledTimes(1);
    expect(mockGrid).toHaveBeenCalledWith(expect.any(Object), 1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      trackPoints.map(({ lat, lon }) => ({ latitude: lat, longitude: lon }))
    );
    // Verify widthGeo is positive
    expect(data.widthGeo).toBeGreaterThan(0);
    // Verify boundsGeo has the correct shape
    expect(data.boundsGeo).toEqual({
      minLat: expect.any(Number),
      minLon: expect.any(Number),
      maxLat: expect.any(Number),
      maxLon: expect.any(Number),
    });
  });

  it("uses default resolution and padding factor when not provided", async () => {
    const tp: LatLon[] = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 1 },
    ];
    mockGrid.mockResolvedValue({ results: [], width: 0, height: 0 });
    mockFetch.mockResolvedValue([]);

    await TerrainGenerator.generate(tp);

    expect(mockGrid).toHaveBeenCalledWith(
      expect.any(Object),
      Config.TERRAIN_GRID_RESOLUTION
    );
  });

  it("propagates errors from fetchGridElevations", async () => {
    const tp: LatLon[] = [
      { lat: 0, lon: 0 },
      { lat: 1, lon: 1 },
    ];
    mockGrid.mockRejectedValue(new Error("Grid fail"));
    await expect(TerrainGenerator.generate(tp, 1, 1)).rejects.toThrow(
      "Grid fail"
    );
  });

  it("propagates errors from fetchElevations", async () => {
    const tp: LatLon[] = [
      { lat: 0, lon: 0 },
      { lat: 1, lon: 1 },
    ];
    mockGrid.mockResolvedValue({ results: [], width: 0, height: 0 });
    mockFetch.mockRejectedValue(new Error("Fetch fail"));
    await expect(TerrainGenerator.generate(tp, 1, 1)).rejects.toThrow(
      "Fetch fail"
    );
  });

  it("correctly maps computed center to XY origin and back", async () => {
    // Use distinct track points to define a center
    const tp: LatLon[] = [
      { lat: 2, lon: 3 },
      { lat: 4, lon: 5 },
    ];
    mockGrid.mockResolvedValue({ results: [], width: 0, height: 0 });
    mockFetch.mockResolvedValue([]);
    const data = await TerrainGenerator.generate(tp, 1, 1);
    // Compute the expected center
    const centerLat = (2 + 4) / 2;
    const centerLon = (3 + 5) / 2;
    // At the center, projection should be at origin
    const origin = data.geoToXY(centerLat, centerLon);
    expect(origin.x).toBeCloseTo(0);
    expect(origin.y).toBeCloseTo(0);
    // And inverse projection recovers the center
    const geo = data.xyToGeo(0, 0);
    expect(geo.lat).toBeCloseTo(centerLat);
    expect(geo.lon).toBeCloseTo(centerLon);
  });
});
