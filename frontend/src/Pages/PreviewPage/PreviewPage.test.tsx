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
    loading: false
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

  it('handles shape change', () => {
    render(<PreviewPage {...defaultProps} />);
    
    const shapeSelect = screen.getByRole('combobox');
    fireEvent.change(shapeSelect, { target: { value: 'circle' } });
    
    expect(defaultProps.onShapeChange).toHaveBeenCalledWith('circle');
  });

  it('handles width change', () => {
    render(<PreviewPage {...defaultProps} />);
    
    const inputs = screen.getAllByRole('spinbutton');
    const widthInput = inputs[0];
    fireEvent.change(widthInput, { target: { value: '150' } });
    
    expect(defaultProps.onWidthChange).toHaveBeenCalledWith(150);
  });

  it('handles altitude multiplier change', () => {
    render(<PreviewPage {...defaultProps} />);
    
    const inputs = screen.getAllByRole('spinbutton');
    const altitudeInput = inputs[1];
    fireEvent.change(altitudeInput, { target: { value: '2.0' } });
    
    expect(defaultProps.onAltMultChange).toHaveBeenCalledWith(2.0);
  });

  it('triggers model regeneration on update button click', () => {
    render(<PreviewPage {...defaultProps} />);
    
    const updateButton = screen.getByText('Update');
    fireEvent.click(updateButton);
    
    expect(defaultProps.onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('displays "Updating..." when loading', () => {
    render(<PreviewPage {...defaultProps} loading={true} />);
    
    expect(screen.getByText('Updating...')).toBeInTheDocument();
    expect(screen.getByText('Updating...')).toBeDisabled();
  });

  it('triggers download on download button click', () => {
    render(<PreviewPage {...defaultProps} />);
    
    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);
    
    expect(defaultProps.onDownload).toHaveBeenCalledTimes(1);
  });
}); 