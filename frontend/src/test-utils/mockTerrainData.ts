import { TerrainData } from "../lib/TerrainGenerator";

// Create a mock implementation of TerrainData for tests
export const createMockTerrainData = (): TerrainData => ({
  geoToXY: (lat: number, lon: number) => ({ x: lat, y: lon }),
  xyToGeo: (x: number, y: number) => ({ lat: x, lon: y }),
  gridPoints: [
    { lat: 37.7749, lon: -122.4194, elevation: 10, originalIndex: 0 },
    { lat: 37.775, lon: -122.4195, elevation: 15, originalIndex: 1 },
  ],
  trackPoints: [
    { lat: 37.7749, lon: -122.4194, elevation: 10 },
    { lat: 37.775, lon: -122.4195, elevation: 15 },
  ],
  boundsGeo: {
    minLat: 37.7749,
    minLon: -122.4195,
    maxLat: 37.775,
    maxLon: -122.4194,
  },
  widthGeo: 0.1,
});

export default createMockTerrainData;
