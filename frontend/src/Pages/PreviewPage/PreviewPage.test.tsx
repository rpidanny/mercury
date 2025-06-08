import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PreviewPage from './PreviewPage';
import { Object3D } from 'three';
import TestWrapper from '../../test-utils/TestWrapper';
import * as AppContext from '../../context/AppContext';
import * as ModelBuilderHook from '../../hooks/useModelBuilder';
import createMockTerrainData from '../../test-utils/mockTerrainData';
import { ShapeType } from '../../lib/types';

// Mock the entire component's hooks
vi.mock('../../hooks/useModelBuilder', () => ({
  useModelBuilder: vi.fn(() => ({
    localMesh: new Object3D(),
    updateModel: vi.fn(),
    downloadModel: vi.fn()
  }))
}));

// Mock THREE.js renderer
vi.mock('../../lib/Renderer', () => {
  return {
    default: class MockRenderer {
      constructor() {}
      renderMesh() {}
      updateMeshPreserveCamera() {}
    }
  };
});

describe('PreviewPage', () => {
  // Standard mock context object
  const mockContext = {
    state: {
      ui: { loading: false, status: '' },
      modelConfig: { 
        shape: 'hexagon' as ShapeType, 
        widthMM: 100, 
        altMult: 1,
        gridRes: 500,
        coverageFactor: 4.0,
        embossText: '',
        rotationAngle: 0,
        lowPolyMode: false
      },
      file: null,
      resources: { 
        font: null, 
        terrainData: createMockTerrainData()
      }
    },
    dispatch: vi.fn(),
    updateModelConfig: vi.fn(),
    setLoading: vi.fn(),
    resetTerrain: vi.fn(),
    setLowPolyMode: vi.fn()
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.classList.remove('model-mode');
    // Default AppContext mock
    vi.spyOn(AppContext, 'useAppContext').mockReturnValue(mockContext);
    // Reset the mocks on hooks
    (ModelBuilderHook.useModelBuilder as ReturnType<typeof vi.fn>).mockClear();
  });
  
  it('renders the scene container for 3D preview', () => {
    render(<PreviewPage />, { wrapper: TestWrapper });
    expect(document.getElementById('scene-container')).toBeInTheDocument();
  });

  it('renders the home button', () => {
    render(<PreviewPage />, { wrapper: TestWrapper });
    const homeButton = screen.getByLabelText('Back to home');
    expect(homeButton).toBeInTheDocument();
  });

  it('calls resetTerrain when home button is clicked', () => {
    const resetTerrain = vi.fn();
    
    // Create context with our own resetTerrain
    vi.spyOn(AppContext, 'useAppContext').mockReturnValue({
      ...mockContext,
      resetTerrain
    });
    
    render(<PreviewPage />);
    
    const homeButton = screen.getByLabelText('Back to home');
    fireEvent.click(homeButton);
    
    expect(resetTerrain).toHaveBeenCalledTimes(1);
  });

  it('handles shape change', async () => {
    const updateModelConfig = vi.fn();
    const updateModel = vi.fn();
    
    // Mock the hook return for this test
    (ModelBuilderHook.useModelBuilder as ReturnType<typeof vi.fn>).mockReturnValue({
      localMesh: new Object3D(),
      updateModel,
      downloadModel: vi.fn()
    });
    
    // Set up our context with the mock functions
    vi.spyOn(AppContext, 'useAppContext').mockReturnValue({
      ...mockContext,
      updateModelConfig
    });
    
    render(<PreviewPage />);
    
    // Open the shape selection panel
    const shapeToolbarBtn = screen.getByTitle('Choose base shape');
    fireEvent.click(shapeToolbarBtn);

    // Find and click the circle shape button
    const circleBtn = screen.getByTitle('Circle base');
    fireEvent.click(circleBtn);

    // Verify that update functions were called
    expect(updateModelConfig).toHaveBeenCalledWith({ shape: 'circle' });
    expect(updateModel).toHaveBeenCalled();
  });

  it('handles width change', () => {
    const updateModelConfig = vi.fn();
    const updateModel = vi.fn();
    
    // Override the model builder hook to return mocked functions
    vi.spyOn(ModelBuilderHook, 'useModelBuilder').mockReturnValue({
      localMesh: new Object3D(),
      updateModel,
      downloadModel: vi.fn()
    });
    
    // Override the context
    vi.spyOn(AppContext, 'useAppContext').mockReturnValue({
      state: {
        ui: { loading: false, status: '' },
        modelConfig: { 
          shape: 'hexagon' as ShapeType, 
          widthMM: 100, 
          altMult: 1,
          gridRes: 500,
          coverageFactor: 4.0,
          embossText: '',
          rotationAngle: 0,
          lowPolyMode: false
        },
        file: null,
        resources: { 
          font: null, 
          terrainData: createMockTerrainData()
        }
      },
      dispatch: vi.fn(),
      updateModelConfig,
      setLoading: vi.fn(),
      resetTerrain: vi.fn(),
      setLowPolyMode: vi.fn()
    });

    // Mock the timeout needed for debouncing
    vi.spyOn(window, 'clearTimeout').mockImplementation(() => undefined);
    vi.spyOn(window, 'setTimeout').mockImplementation((fn: TimerHandler) => {
      if (typeof fn === 'function') fn();
      return 123 as unknown as NodeJS.Timeout; // Return a dummy timeout ID
    });

    render(<PreviewPage />);

    // Open the width control panel
    const widthToolbarBtn = screen.getByTitle('Resize your 3D model');
    fireEvent.click(widthToolbarBtn);

    // Find and change the width slider
    const widthSlider = screen.getByRole('slider', { name: 'Adjust model width' });
    fireEvent.change(widthSlider, { target: { value: '150' } });

    expect(updateModelConfig).toHaveBeenCalledWith({ widthMM: 150 });
    expect(updateModel).toHaveBeenCalled();
  });

  it('handles altitude multiplier change', () => {
    const updateModelConfig = vi.fn();
    const updateModel = vi.fn();
    
    // Override the context with mocked functions
    vi.spyOn(AppContext, 'useAppContext').mockReturnValue({
      state: {
        ui: { loading: false, status: '' },
        modelConfig: { 
          shape: 'hexagon' as ShapeType, 
          widthMM: 100, 
          altMult: 1,
          gridRes: 500,
          coverageFactor: 4.0,
          embossText: '',
          rotationAngle: 0,
          lowPolyMode: false
        },
        file: null,
        resources: { 
          font: null, 
          terrainData: createMockTerrainData()
        }
      },
      dispatch: vi.fn(),
      updateModelConfig,
      setLoading: vi.fn(),
      resetTerrain: vi.fn(),
      setLowPolyMode: vi.fn()
    });
    
    // Override model builder hook
    vi.spyOn(ModelBuilderHook, 'useModelBuilder').mockReturnValue({
      localMesh: new Object3D(),
      updateModel,
      downloadModel: vi.fn()
    });

    render(<PreviewPage />);

    // Open the altitude control panel
    const altToolbarBtn = screen.getByTitle('Scale terrain elevation');
    fireEvent.click(altToolbarBtn);

    // Find the Altitude Multiplier label
    expect(screen.getByText('Altitude Multiplier')).toBeInTheDocument();

    // Find and change the altitude slider
    const altSlider = screen.getByRole('slider', { name: 'Adjust altitude multiplier' });
    fireEvent.change(altSlider, { target: { value: '2.0' } });
    
    // Simulate end of sliding to trigger update
    fireEvent.mouseUp(altSlider);

    expect(updateModelConfig).toHaveBeenCalledWith({ altMult: 2 });
    expect(updateModel).toHaveBeenCalled();
  });

  it('triggers download on download button click', () => {
    const downloadModel = vi.fn();
    
    // Mock the hook to return our own download function
    (ModelBuilderHook.useModelBuilder as ReturnType<typeof vi.fn>).mockReturnValue({
      localMesh: new Object3D(),
      updateModel: vi.fn(),
      downloadModel
    });

    render(<PreviewPage />);

    const downloadButton = screen.getByRole('button', { name: 'Download STL model' });
    fireEvent.click(downloadButton);

    expect(downloadModel).toHaveBeenCalledTimes(1);
  });
}); 