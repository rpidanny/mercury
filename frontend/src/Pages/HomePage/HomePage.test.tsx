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
    expect(screen.getByText('Transform your adventure into stunning 3D terrain')).toBeInTheDocument();
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
          gridRes: 500,
          paddingFac: 4.0,
          embossText: '',
          rotationAngle: 0 
        },
        file: null,
        resources: { font: null, terrainData: null }
      },
      dispatch: mockDispatch,
      updateModelConfig: vi.fn(),
      setLoading: vi.fn(),
      resetTerrain: vi.fn()
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
          gridRes: 500,
          paddingFac: 4.0,
          embossText: '',
          rotationAngle: 0 
        },
        file: null,
        resources: { font: null, terrainData: null }
      },
      dispatch: vi.fn(),
      updateModelConfig: mockUpdateModelConfig,
      setLoading: vi.fn(),
      resetTerrain: vi.fn()
    });

    render(<HomePage />);
    
    // Test grid resolution input
    const gridResInput = screen.getByLabelText(/detail level/i);
    fireEvent.change(gridResInput, { target: { value: '600' } });
    expect(mockUpdateModelConfig).toHaveBeenCalledWith({ gridRes: 600 });
    
    // Test padding factor input
    const paddingInput = screen.getByLabelText(/coverage factor/i);
    fireEvent.change(paddingInput, { target: { value: '5.5' } });
    expect(mockUpdateModelConfig).toHaveBeenCalledWith({ paddingFac: 5.5 });
    
    // Test emboss text input
    const textArea = screen.getByLabelText(/personalize your model/i);
    fireEvent.change(textArea, { target: { value: 'My Adventure' } });
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
          gridRes: 500,
          paddingFac: 4.0,
          embossText: '',
          rotationAngle: 0 
        },
        file: null,
        resources: { font: null, terrainData: null }
      },
      dispatch: vi.fn(),
      updateModelConfig: vi.fn(),
      setLoading: vi.fn(),
      resetTerrain: vi.fn()
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
        ui: { loading: true, status: 'Creating Your Model...' },
        modelConfig: { 
          shape: 'hexagon', 
          widthMM: 100, 
          altMult: 1,
          gridRes: 500,
          paddingFac: 4.0,
          embossText: '',
          rotationAngle: 0 
        },
        file: null,
        resources: { font: null, terrainData: null }
      },
      dispatch: vi.fn(),
      updateModelConfig: vi.fn(),
      setLoading: vi.fn(),
      resetTerrain: vi.fn()
    });

    render(<HomePage />);
    
    const generateButton = screen.getByText('Creating Your Model...');
    expect(generateButton).toBeDisabled();
  });
}); 