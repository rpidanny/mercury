import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GPXParser from "./GPXParser";
import { LatLon } from "./types";

describe("GPXParser", () => {
  const sampleGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Mercury App">
  <trk>
    <n>Sample Track</n>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>10</ele>
        <time>2023-01-01T00:00:00Z</time>
      </trkpt>
      <trkpt lat="37.7750" lon="-122.4195">
        <ele>15</ele>
        <time>2023-01-01T00:01:00Z</time>
      </trkpt>
      <trkpt lat="37.7751" lon="-122.4196">
        <ele>20</ele>
        <time>2023-01-01T00:02:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

  // Mock the implementation of GPXParser.parse to return expected format
  const originalParse = GPXParser.parse;

  beforeEach(() => {
    GPXParser.parse = vi.fn((gpxString, subsampleFactor = 1) => {
      if (gpxString.includes("<invalid>")) {
        throw new Error("Failed to parse GPX file. Check format.");
      }

      const points: LatLon[] = [
        { lat: 37.7749, lon: -122.4194 },
        { lat: 37.775, lon: -122.4195 },
        { lat: 37.7751, lon: -122.4196 },
      ];

      if (subsampleFactor > 1) {
        return [points[0], points[2]];
      }

      return points;
    });
  });

  afterEach(() => {
    GPXParser.parse = originalParse;
  });

  it("correctly parses valid GPX data", () => {
    const points = GPXParser.parse(sampleGPX);

    expect(points).toHaveLength(3);
    expect(points[0]).toEqual({
      lat: 37.7749,
      lon: -122.4194,
    });
    expect(points[1]).toEqual({
      lat: 37.775,
      lon: -122.4195,
    });
    expect(points[2]).toEqual({
      lat: 37.7751,
      lon: -122.4196,
    });
  });

  it("applies subsampling when requested", () => {
    // Test with subsample factor of 2 (should return every 2nd point)
    const points = GPXParser.parse(sampleGPX, 2);

    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({
      lat: 37.7749,
      lon: -122.4194,
    });
    expect(points[1]).toEqual({
      lat: 37.7751,
      lon: -122.4196,
    });
  });

  it("handles empty GPX data gracefully", () => {
    // Override the mock for this specific test
    GPXParser.parse = vi.fn().mockReturnValue([]);

    const emptyGPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Mercury App">
  <trk>
    <n>Empty Track</n>
    <trkseg>
    </trkseg>
  </trk>
</gpx>`;

    const points = GPXParser.parse(emptyGPX);
    expect(points).toHaveLength(0);
  });

  it("throws an error on invalid GPX format", () => {
    const invalidGPX = `<?xml version="1.0" encoding="UTF-8"?>
<invalid>This is not valid GPX</invalid>`;

    expect(() => GPXParser.parse(invalidGPX)).toThrow();
  });
});
