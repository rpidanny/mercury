import Config from "./config";
import { LatLon, TerrainGridPoint, TerrainTrackPoint } from "./types";
import ElevationService from "./ElevationService";

export interface TerrainData {
  geoToXY: (lat: number, lon: number) => { x: number; y: number };
  xyToGeo: (x: number, y: number) => { lat: number; lon: number };
  gridPoints: TerrainGridPoint[];
  trackPoints: TerrainTrackPoint[];
  boundsGeo: { minLat: number; minLon: number; maxLat: number; maxLon: number };
  /** Width of the terrain region in geographic units */
  widthGeo: number;
}

/**
 * Computes projection, hexagon bounds, and sample grid points inside hexagon.
 */
export default class TerrainGenerator {
  static async generate(
    trackPoints: LatLon[],
    resolution: number = Config.TERRAIN_GRID_RESOLUTION,
    paddingFactor: number = Config.HEX_PADDING_FACTOR_DEFAULT
  ): Promise<TerrainData> {
    this.validateTrackPoints(trackPoints);

    const { center } = this.computeGeoBounds(trackPoints);
    const { geoToXY, xyToGeo } = this.createProjection(center);
    const trackPointsXY = trackPoints.map(({ lat, lon }) => geoToXY(lat, lon));

    const rectExtents = this.computeRectangularExtents(
      trackPointsXY,
      paddingFactor
    );
    const { apiBounds, boundsGeo } = this.createBounds(rectExtents, xyToGeo);

    const gridPoints = await this.fetchGridPoints(apiBounds, resolution);
    const trackPointsData = await this.fetchTrackPoints(trackPoints);

    return {
      geoToXY,
      xyToGeo,
      gridPoints,
      trackPoints: trackPointsData,
      boundsGeo,
      widthGeo: rectExtents.widthGeo,
    };
  }

  private static validateTrackPoints(trackPoints: LatLon[]): void {
    if (trackPoints.length < 2) {
      throw new Error("Need at least 2 track points to generate terrain.");
    }
  }

  private static computeGeoBounds(trackPoints: LatLon[]): {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
    center: { lat: number; lon: number };
  } {
    const lats = trackPoints.map(({ lat }) => lat);
    const lons = trackPoints.map(({ lon }) => lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    return {
      minLat,
      maxLat,
      minLon,
      maxLon,
      center: { lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2 },
    };
  }

  private static createProjection(center: { lat: number; lon: number }): {
    geoToXY: (lat: number, lon: number) => { x: number; y: number };
    xyToGeo: (x: number, y: number) => { lat: number; lon: number };
  } {
    const R = 6371000;
    const rad = Math.PI / 180;
    const metersPerLat = R * rad;
    const metersPerLon = R * Math.cos(center.lat * rad) * rad;
    const geoToXY = (lat: number, lon: number) => ({
      x: (lon - center.lon) * metersPerLon,
      y: (lat - center.lat) * metersPerLat,
    });
    const xyToGeo = (x: number, y: number) => ({
      lon: x / metersPerLon + center.lon,
      lat: y / metersPerLat + center.lat,
    });
    return { geoToXY, xyToGeo };
  }

  private static computeRectangularExtents(
    pointsXY: { x: number; y: number }[],
    paddingFactor: number
  ): {
    regionMinX: number;
    regionMaxX: number;
    regionMinY: number;
    regionMaxY: number;
    widthGeo: number;
  } {
    const xs = pointsXY.map(({ x }) => x);
    const ys = pointsXY.map(({ y }) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const widthOrig = maxX - minX;
    const heightOrig = maxY - minY;
    const widthGeo = widthOrig * paddingFactor;
    const heightGeo = heightOrig * paddingFactor;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    return {
      regionMinX: centerX - widthGeo,
      regionMaxX: centerX + widthGeo,
      regionMinY: centerY - heightGeo,
      regionMaxY: centerY + heightGeo,
      widthGeo,
    };
  }

  private static createBounds(
    extents: {
      regionMinX: number;
      regionMaxX: number;
      regionMinY: number;
      regionMaxY: number;
    },
    xyToGeo: (x: number, y: number) => { lat: number; lon: number }
  ): {
    apiBounds: {
      min_latitude: number;
      min_longitude: number;
      max_latitude: number;
      max_longitude: number;
    };
    boundsGeo: {
      minLat: number;
      minLon: number;
      maxLat: number;
      maxLon: number;
    };
  } {
    const sw = xyToGeo(extents.regionMinX, extents.regionMinY);
    const ne = xyToGeo(extents.regionMaxX, extents.regionMaxY);
    return {
      apiBounds: {
        min_latitude: sw.lat,
        min_longitude: sw.lon,
        max_latitude: ne.lat,
        max_longitude: ne.lon,
      },
      boundsGeo: {
        minLat: sw.lat,
        minLon: sw.lon,
        maxLat: ne.lat,
        maxLon: ne.lon,
      },
    };
  }

  private static async fetchGridPoints(
    apiBounds: {
      min_latitude: number;
      min_longitude: number;
      max_latitude: number;
      max_longitude: number;
    },
    resolution: number
  ): Promise<TerrainGridPoint[]> {
    const { results } = await ElevationService.fetchGridElevations(
      apiBounds,
      resolution
    );
    return results.map((p, i) => ({
      lat: p.latitude,
      lon: p.longitude,
      elevation: p.elevation,
      originalIndex: i,
    }));
  }

  private static async fetchTrackPoints(
    trackPoints: LatLon[]
  ): Promise<TerrainTrackPoint[]> {
    const lookup = trackPoints.map(({ lat, lon }) => ({
      latitude: lat,
      longitude: lon,
    }));
    const results = await ElevationService.fetchElevations(lookup);
    return results.map((p) => ({
      lat: p.latitude,
      lon: p.longitude,
      elevation: p.elevation,
    }));
  }
}
