import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './HomePage';
import TestWrapper from '../../test-utils/TestWrapper';
import * as AppContext from '../../context/AppContext';
import * as TerrainHook from '../../hooks/useTerrain';

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with title', () => {
    render(<HomePage />, { wrapper: TestWrapper });
    expect(screen.getByText('Mercury')).toBeInTheDocument();
    expect(screen.getByText('Transform your GPS adventures into stunning 3D terrain models')).toBeInTheDocument();
  });

  it('handles file input changes', async () => {
    // Mock dispatch function
    const mockDispatch = vi.fn();
    vi.spyOn(AppContext, 'useAppContext').mockReturnValue({
      state: {
        ui: { loading: false, status: '' },
        modelConfig: { 
          shape: 'hexagon', 
          widthMM: 100, 
          altMult: 1,
          modelResolution: 500,
          paddingFactor: 4.0,
          embossText: '',
          rotationAngle: 0,
          lowPolyMode: false
        },
        file: null,
        resources: { font: null, terrainData: null }
      },
      dispatch: mockDispatch,
      updateModelConfig: vi.fn(),
      setLoading: vi.fn(),
      resetTerrain: vi.fn(),
      setLowPolyMode: vi.fn()
    });

    render(<HomePage />);
    
    const fileInput = screen.getByLabelText(/adventure track/i);
    const mockFile = new File(['dummy content'], 'test.gpx', { type: 'application/gpx+xml' });
    
    // Fire change event with mock file
    await userEvent.upload(fileInput, mockFile);
    
    expect(mockDispatch).toHaveBeenCalledWith({ 
      type: 'SET_FILE', 
      payload: mockFile 
    });
  });

  it('handles model config changes', () => {
    // Mock updateModelConfig function
    const mockUpdateModelConfig = vi.fn();
    vi.spyOn(AppContext, 'useAppContext').mockReturnValue({
      state: {
        ui: { loading: false, status: '' },
        modelConfig: { 
          shape: 'hexagon', 
          widthMM: 100, 
          altMult: 1,
          modelResolution: 500,
          paddingFactor: 4.0,
          embossText: '',
          rotationAngle: 0,
          lowPolyMode: false
        },
        file: null,
        resources: { font: null, terrainData: null }
      },
      dispatch: vi.fn(),
      updateModelConfig: mockUpdateModelConfig,
      setLoading: vi.fn(),
      resetTerrain: vi.fn(),
      setLowPolyMode: vi.fn()
    });

    render(<HomePage />);
    
    // Test model resolution buttons - click the "Medium" button
    const mediumButton = screen.getByText('Medium');
    fireEvent.click(mediumButton);
    expect(mockUpdateModelConfig).toHaveBeenCalledWith({ modelResolution: 1000 });
    
    // Test padding factor input
    const paddingInput = screen.getByLabelText(/padding factor/i);
    fireEvent.change(paddingInput, { target: { value: '5.5' } });
    expect(mockUpdateModelConfig).toHaveBeenCalledWith({ paddingFactor: 5.5 });
    
    // Test emboss text input
    const textInput = screen.getByLabelText(/custom engraving/i);
    fireEvent.change(textInput, { target: { value: 'My Adventure' } });
    expect(mockUpdateModelConfig).toHaveBeenCalledWith({ embossText: 'My Adventure' });
  });

  it('triggers generate terrain function on button click', () => {
    // Mock generateTerrain function
    const mockGenerateTerrain = vi.fn();
    vi.spyOn(TerrainHook, 'useTerrain').mockReturnValue({
      generateTerrain: mockGenerateTerrain
    });

    vi.spyOn(AppContext, 'useAppContext').mockReturnValue({
      state: {
        ui: { loading: false, status: '' },
        modelConfig: { 
          shape: 'hexagon', 
          widthMM: 100, 
          altMult: 1,
          modelResolution: 500,
          paddingFactor: 4.0,
          embossText: '',
          rotationAngle: 0,
          lowPolyMode: false
        },
        file: null,
        resources: { font: null, terrainData: null }
      },
      dispatch: vi.fn(),
      updateModelConfig: vi.fn(),
      setLoading: vi.fn(),
      resetTerrain: vi.fn(),
      setLowPolyMode: vi.fn()
    });

    render(<HomePage />);
    
    const generateButton = screen.getByText('Generate 3D Terrain');
    fireEvent.click(generateButton);
    
    expect(mockGenerateTerrain).toHaveBeenCalledTimes(1);
  });

  it('disables generate button when loading', () => {
    // Mock context with loading state
    vi.spyOn(AppContext, 'useAppContext').mockReturnValue({
      state: {
        ui: { loading: true, status: 'Creating Magic...' },
        modelConfig: { 
          shape: 'hexagon', 
          widthMM: 100, 
          altMult: 1,
          modelResolution: 500,
          paddingFactor: 4.0,
          embossText: '',
          rotationAngle: 0,
          lowPolyMode: false
        },
        file: null,
        resources: { font: null, terrainData: null }
      },
      dispatch: vi.fn(),
      updateModelConfig: vi.fn(),
      setLoading: vi.fn(),
      resetTerrain: vi.fn(),
      setLowPolyMode: vi.fn()
    });

    render(<HomePage />);
    
    // Find the button that contains the loading text
    const loadingText = screen.getByText('Creating Magic...');
    const generateButton = loadingText.closest('button');
    
    expect(generateButton).not.toBeNull();
    expect(generateButton).toBeDisabled();
    expect(loadingText).toBeInTheDocument();
  });
}); 