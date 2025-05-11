import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './HomePage';

describe('HomePage', () => {
  // Default props for testing
  const defaultProps = {
    onFileChange: vi.fn(),
    shape: 'hexagon' as const,
    onShapeChange: vi.fn(),
    widthMM: 100,
    onWidthChange: vi.fn(),
    altMult: 1,
    onAltMultChange: vi.fn(),
    gridRes: 500,
    onGridResChange: vi.fn(),
    paddingFac: 4.0,
    onPaddingFacChange: vi.fn(),
    embossText: '',
    onEmbossTextChange: vi.fn(),
    loading: false,
    onGenerate: vi.fn()
  };

  it('renders the component with title', () => {
    render(<HomePage {...defaultProps} />);
    expect(screen.getByText('Mercury')).toBeInTheDocument();
    expect(screen.getByText('Turn your adventure into a 3D view of the surrounding terrain')).toBeInTheDocument();
  });

  it('handles file input changes', async () => {
    render(<HomePage {...defaultProps} />);
    
    const fileInput = screen.getByLabelText(/upload gpx file/i);
    const mockFile = new File(['dummy content'], 'test.gpx', { type: 'application/gpx+xml' });
    
    // Fire change event with mock file
    await userEvent.upload(fileInput, mockFile);
    
    expect(defaultProps.onFileChange).toHaveBeenCalledWith(mockFile);
  });

  it('handles shape selection changes', () => {
    render(<HomePage {...defaultProps} />);
    
    const shapeSelect = screen.getByLabelText(/shape/i);
    fireEvent.change(shapeSelect, { target: { value: 'circle' } });
    
    expect(defaultProps.onShapeChange).toHaveBeenCalledWith('circle');
  });

  it('handles numeric input changes', () => {
    render(<HomePage {...defaultProps} />);
    
    // Test width input
    const widthInput = screen.getByLabelText(/model width/i);
    fireEvent.change(widthInput, { target: { value: '200' } });
    expect(defaultProps.onWidthChange).toHaveBeenCalledWith(200);
    
    // Test altitude multiplier input
    const altMultInput = screen.getByLabelText(/altitude multiplier/i);
    fireEvent.change(altMultInput, { target: { value: '2.5' } });
    expect(defaultProps.onAltMultChange).toHaveBeenCalledWith(2.5);
  });

  it('handles text emboss input', () => {
    render(<HomePage {...defaultProps} />);
    
    const textArea = screen.getByLabelText(/text to emboss/i);
    fireEvent.change(textArea, { target: { value: 'My Adventure' } });
    
    expect(defaultProps.onEmbossTextChange).toHaveBeenCalledWith('My Adventure');
  });

  it('triggers generate function on button click', () => {
    render(<HomePage {...defaultProps} />);
    
    const generateButton = screen.getByText('Generate 3D Terrain');
    fireEvent.click(generateButton);
    
    expect(defaultProps.onGenerate).toHaveBeenCalledTimes(1);
  });

  it('disables generate button when loading', () => {
    render(<HomePage {...defaultProps} loading={true} />);
    
    const generateButton = screen.getByText('Processing...');
    expect(generateButton).toBeDisabled();
  });
}); 