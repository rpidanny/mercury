import * as THREE from "three";

const Config = {
  API_URL: "http://localhost:8848/api/v1/lookup",
  GRID_URL: "http://localhost:8848/api/v1/grid",
  FONT_URL:
    "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/helvetiker_regular.typeface.json",
  TERRAIN_GRID_RESOLUTION: 2000,
  HEX_PADDING_FACTOR_DEFAULT: 4.0,
  HEX_PADDING_INCREMENT: 0.05,
  MAX_PADDING_ITERATIONS: 5,
  PATH_ELEVATION_MM: 0.2,
  PATH_RADIUS_MM: 0.2,
  BASE_THICKNESS_MM: 2.0,
  BASE_OVERLAP_FACTOR: 1.005,
  BOUNDARY_THRESHOLD_MM: 1.0,
  TEXT_PLATFORM_HEIGHT_OFFSET: 1.0,
  TEXT_PLATFORM_MARGIN_FACTOR: 0.2,
  TEXT_PLATFORM_WIDTH_FACTOR: 0.8,
  TEXT_PLATFORM_DEPTH_FACTOR: 0.15,
  TEXT_EMBOSS_DEPTH: 1.0,
  TEXT_SIZE_FACTOR: 0.08,
  TEXT_PADDING_FACTOR: 0.9,
  TEXT_PATH_BUFFER: 5.0,
  WORLD_Z_UP: new THREE.Vector3(0, 0, 1),
  WORLD_X: new THREE.Vector3(1, 0, 0),
  MIN_SEGMENT_LENGTH_SQ: 1e-6,
};

export default Config;
