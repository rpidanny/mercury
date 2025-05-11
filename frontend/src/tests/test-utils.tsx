import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Utility function to create a custom render with any providers if needed in the future
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return {
    user: userEvent.setup(),
    ...render(ui, options)
  };
};

// Create a mock GPX file
const createMockGPXFile = (content = 'mock gpx content') => {
  return new File([content], 'track.gpx', { type: 'application/gpx+xml' });
};

// Sample GPX content for tests
const sampleGPXContent = `
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Mercury App">
  <trk>
    <name>Sample Track</name>
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
</gpx>
`;

// Function to create sample terrain data for tests
const createMockTerrainData = () => {
  return {
    grid: [
      [10, 20, 30],
      [15, 25, 35],
      [20, 30, 40]
    ],
    bounds: {
      min: { x: 0, y: 0 },
      max: { x: 2, y: 2 }
    }
  };
};

// Re-export everything from testing-library
export * from '@testing-library/react';

// Export custom utilities
export {
  customRender as render,
  createMockGPXFile,
  sampleGPXContent,
  createMockTerrainData
}; 