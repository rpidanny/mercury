import { LatLon } from "./types";

export default class GPXParser {
  /**
   * Converts degrees to radians.
   */
  private static toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  /**
   * Calculates the distance in meters between two LatLon points using the haversine formula.
   */
  private static haversineDistance(a: LatLon, b: LatLon): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = GPXParser.toRad(b.lat - a.lat);
    const dLon = GPXParser.toRad(b.lon - a.lon);
    const radLat1 = GPXParser.toRad(a.lat);
    const radLat2 = GPXParser.toRad(b.lat);

    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const h =
      sinLat * sinLat + Math.cos(radLat1) * Math.cos(radLat2) * sinLon * sinLon;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  }

  /**
   * Parses a GPX XML string and returns an array of LatLon points downsampled to a specified resolution.
   * @param gpxString The GPX XML string.
   * @param resolutionMeters Minimum distance between consecutive points in meters (default 1).
   */
  static parse(gpxString: string, resolutionMeters: number = 5): LatLon[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxString, "text/xml");
    const errorEl = xmlDoc.querySelector("parsererror");
    if (errorEl) {
      throw new Error("Failed to parse GPX file. Check format.");
    }
    const points: LatLon[] = [];
    // Extract track or waypoint points
    for (const tag of ["trkpt", "wpt"]) {
      const elements = Array.from(xmlDoc.getElementsByTagName(tag));
      elements.forEach((el) => {
        const lat = parseFloat(el.getAttribute("lat") || "");
        const lon = parseFloat(el.getAttribute("lon") || "");
        if (!isNaN(lat) && !isNaN(lon)) {
          points.push({ lat, lon });
        }
      });
      if (points.length > 0) break;
    }
    if (points.length === 0) {
      throw new Error("No valid <trkpt> or <wpt> elements with lat/lon found.");
    }
    // Downsample points to configurable resolution
    const downsampled: LatLon[] = [points[0]];
    let lastPt = points[0];
    for (let i = 1; i < points.length; i++) {
      const pt = points[i];
      if (GPXParser.haversineDistance(lastPt, pt) >= resolutionMeters) {
        downsampled.push(pt);
        lastPt = pt;
      }
    }
    return downsampled;
  }
}
