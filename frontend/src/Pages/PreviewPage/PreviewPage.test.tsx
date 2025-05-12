import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PreviewPage from './PreviewPage';
import { Object3D } from 'three';

// Mock the Renderer class
vi.mock('../../lib/Renderer', () => {
  return {
    default: class MockRenderer {
      constructor() {
        // Mock constructor
      }
      renderMesh() {
        // Mock renderMesh method
      }
    }
  };
});

describe('PreviewPage', () => {
  // Create a mock mesh
  const mockMesh = new Object3D();
  
  // Default props for testing
  const defaultProps = {
    mesh: mockMesh,
    onDownload: vi.fn(),
    shape: 'hexagon' as const,
    onShapeChange: vi.fn(),
    widthMM: 100,
    onWidthChange: vi.fn(),
    altMult: 1,
    onAltMultChange: vi.fn(),
    onRegenerate: vi.fn(),
    loading: false,
    onReset: vi.fn(),
    rotationAngle: 0,
    onRotationChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the scene container for 3D preview', () => {
    render(<PreviewPage {...defaultProps} />);
    
    expect(document.getElementById('scene-container')).toBeInTheDocument();
  });

  it('adds model-mode class to body on mount', () => {
    render(<PreviewPage {...defaultProps} />);
    
    expect(document.body.classList.contains('model-mode')).toBe(true);
  });

  it('renders the home button', () => {
    render(<PreviewPage {...defaultProps} />);
    
    const homeButton = screen.getByLabelText('Back to home');
    expect(homeButton).toBeInTheDocument();
  });

  it('calls onReset when home button is clicked', () => {
    render(<PreviewPage {...defaultProps} />);
    
    const homeButton = screen.getByLabelText('Back to home');
    fireEvent.click(homeButton);
    
    expect(defaultProps.onReset).toHaveBeenCalledTimes(1);
  });

  it('handles shape change', () => {
    render(<PreviewPage {...defaultProps} />);
    // Open the shape selection panel
    const shapeToolbarBtn = screen.getByTitle('Change shape');
    fireEvent.click(shapeToolbarBtn);

    // Select the circle shape button (accessible name is the title attr)
    const circleBtn = screen.getByRole('button', { name: 'Circle shape' });
    fireEvent.click(circleBtn);

    expect(defaultProps.onShapeChange).toHaveBeenCalledWith('circle');
  });

  it('handles width change', () => {
    render(<PreviewPage {...defaultProps} />);

    // Open the width control panel
    const widthToolbarBtn = screen.getByTitle('Adjust model size');
    fireEvent.click(widthToolbarBtn);

    // Find the width slider (range input)
    const widthSlider = screen.getByRole('slider', { name: 'Adjust model width' });
    fireEvent.change(widthSlider, { target: { value: '150' } });

    expect(defaultProps.onWidthChange).toHaveBeenCalledWith(150);
  });

  it('handles altitude multiplier change', () => {
    render(<PreviewPage {...defaultProps} />);

    // Open the altitude control panel
    const altToolbarBtn = screen.getByTitle('Adjust altitude');
    fireEvent.click(altToolbarBtn);

    // Find altitude slider (range input)
    const altSlider = screen.getByRole('slider', { name: 'Adjust altitude multiplier' });
    fireEvent.change(altSlider, { target: { value: '2.0' } });

    expect(defaultProps.onAltMultChange).toHaveBeenCalledWith(2.0);
  });

  it('triggers model regeneration after width change debounce', () => {
    vi.useFakeTimers();
    render(<PreviewPage {...defaultProps} />);

    // Open width panel and change value
    const widthToolbarBtn = screen.getByTitle('Adjust model size');
    fireEvent.click(widthToolbarBtn);
    const widthSlider = screen.getByRole('slider', { name: 'Adjust model width' });
    fireEvent.change(widthSlider, { target: { value: '200' } });

    // Fast-forward debounce timer (300 ms)
    vi.advanceTimersByTime(300);

    expect(defaultProps.onRegenerate).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('displays "Updating..." when loading', () => {
    render(<PreviewPage {...defaultProps} loading={true} />);
    
    expect(screen.getByText('Updating...')).toBeInTheDocument();
  });

  it('triggers download on download button click', () => {
    render(<PreviewPage {...defaultProps} />);

    const downloadButton = screen.getByRole('button', { name: 'Download STL model' });
    fireEvent.click(downloadButton);

    expect(defaultProps.onDownload).toHaveBeenCalledTimes(1);
  });

  it('removes model-mode class from body on unmount', () => {
    const { unmount } = render(<PreviewPage {...defaultProps} />);
    
    // Check that class is added
    expect(document.body.classList.contains('model-mode')).toBe(true);
    
    // Unmount component
    unmount();
    
    // Check that class is removed
    expect(document.body.classList.contains('model-mode')).toBe(false);
  });
}); 