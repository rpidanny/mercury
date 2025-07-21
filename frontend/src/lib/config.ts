import * as THREE from "three";
import { DEFAULT_FONT_URL } from "./fonts";

const Config = {
  API_URL: "http://localhost:8848/api/v1/lookup",
  GRID_URL: "http://localhost:8848/api/v1/grid",
  FONT_URL: DEFAULT_FONT_URL,
  TERRAIN_GRID_RESOLUTION: 2000,
  HEX_PADDING_FACTOR_DEFAULT: 4.0,
  HEX_PADDING_INCREMENT: 0.05,
  MAX_PADDING_ITERATIONS: 5,
  PATH_ELEVATION_MM: 0.0,
  PATH_RADIUS_MM: 0.5,
  BASE_THICKNESS_MM: 2.0,
  BASE_OVERLAP_FACTOR: 1.005,
  BOUNDARY_THRESHOLD_MM: 1.0,
  TEXT_PLATFORM_HEIGHT_OFFSET: 1.0,
  TEXT_PLATFORM_MARGIN_FACTOR: 0.15,
  TEXT_PLATFORM_WIDTH_FACTOR: 0.88, // Increased by 10% from 0.8 for better text fitting
  TEXT_PLATFORM_DEPTH_FACTOR: 0.165, // Increased by 10% from 0.15 for better text fitting
  TEXT_EMBOSS_DEPTH: 1.0,
  TEXT_SIZE_FACTOR: 0.15, // Increased from 0.08 to 0.15 for better 3D printability
  TEXT_PADDING_FACTOR: 0.9,
  TEXT_PATH_BUFFER: 5.0,
  WORLD_Z_UP: new THREE.Vector3(0, 0, 1),
  WORLD_X: new THREE.Vector3(1, 0, 0),
  MIN_SEGMENT_LENGTH_SQ: 1e-6,

  // Performance-related configuration
  MAX_POINTS_THRESHOLD: 10000, // Maximum number of points before simplification
  SIMPLIFY_TARGET_POINTS: 5000, // Target number of points after simplification
  MAX_TRACK_POINTS: 1000, // Maximum number of track points
  HIGH_DETAIL_CURVE_SEGMENTS: 4,
  LOW_DETAIL_CURVE_SEGMENTS: 2,
  HIGH_DETAIL_RADIAL_SEGMENTS: 16,
  LOW_DETAIL_RADIAL_SEGMENTS: 8,
};

export default Config;
