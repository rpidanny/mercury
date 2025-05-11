import Config from "./config";
import { LookupPoint, ElevationResult } from "./types";

const BATCH_SIZE = 10000;
const CONCURRENCY_LIMIT = 10;

/**
 * Service to fetch elevation data from remote API.
 */
export default class ElevationService {
  /**
   * Fetches elevations for given locations in batches with limited concurrency.
   */
  static async fetchElevations(
    locations: LookupPoint[]
  ): Promise<ElevationResult[]> {
    const batches: LookupPoint[][] = [];
    for (let i = 0; i < locations.length; i += BATCH_SIZE) {
      batches.push(locations.slice(i, i + BATCH_SIZE));
    }

    const allResults: ElevationResult[] = [];

    for (let i = 0; i < batches.length; i += CONCURRENCY_LIMIT) {
      const chunk = batches.slice(i, i + CONCURRENCY_LIMIT);
      const chunkResults = await Promise.all(
        chunk.map(async (batch, idx) => {
          const batchIndex = i + idx;
          console.log(
            `[ElevationService] Starting batch ${batchIndex} with ${batch.length} locations`
          );
          const response = await fetch(Config.API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ locations: batch }),
          });
          if (!response.ok) {
            const body = await response.text().catch(() => "");
            throw new Error(
              `API Error ${response.status}: ${response.statusText}. ${body}`
            );
          }
          const data = await response.json();
          console.log(
            `[ElevationService] Completed batch ${batchIndex} with ${data.results.length} results`
          );
          if (!data.results || !Array.isArray(data.results)) {
            throw new Error("Invalid API response format.");
          }
          return data.results as ElevationResult[];
        })
      );
      chunkResults.forEach((res) => allResults.push(...res));
    }

    return allResults;
  }

  /**
   * Fetches a grid of elevations within given bounds at specified resolution.
   */
  static async fetchGridElevations(
    bounds: {
      min_latitude: number;
      min_longitude: number;
      max_latitude: number;
      max_longitude: number;
    },
    resolution: number
  ): Promise<{ results: ElevationResult[]; width: number; height: number }> {
    const response = await fetch(Config.GRID_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bounds, resolution }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Grid API Error ${response.status}: ${response.statusText}. ${body}`
      );
    }
    const data = await response.json();
    if (
      !data.results ||
      !Array.isArray(data.results) ||
      typeof data.width !== "number" ||
      typeof data.height !== "number"
    ) {
      throw new Error("Invalid Grid API response format.");
    }
    return data as {
      results: ElevationResult[];
      width: number;
      height: number;
    };
  }
}
