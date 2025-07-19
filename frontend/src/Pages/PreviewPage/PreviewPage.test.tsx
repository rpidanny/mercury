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
        modelResolution: 500,
        paddingFactor: 4.0,
        embossText: '',
        rotationAngle: 0,
        lowPolyMode: false,
        textPlatformHeightOverride: undefined
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
          modelResolution: 500,
          paddingFactor: 4.0,
          embossText: '',
          rotationAngle: 0,
          lowPolyMode: false,
          textPlatformHeightOverride: undefined
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
          modelResolution: 500,
          paddingFactor: 4.0,
          embossText: '',
          rotationAngle: 0,
          lowPolyMode: false,
          textPlatformHeightOverride: undefined
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

  it('shows text height control when emboss text is present', () => {
    const updateModelConfig = vi.fn();
    const updateModel = vi.fn();
    
    // Override model builder hook
    vi.spyOn(ModelBuilderHook, 'useModelBuilder').mockReturnValue({
      localMesh: new Object3D(),
      updateModel,
      downloadModel: vi.fn()
    });
    
    // Override the context with emboss text
    vi.spyOn(AppContext, 'useAppContext').mockReturnValue({
      state: {
        ui: { loading: false, status: '' },
        modelConfig: { 
          shape: 'hexagon' as ShapeType, 
          widthMM: 100, 
          altMult: 1,
          modelResolution: 500,
          paddingFactor: 4.0,
          embossText: 'Test Text',
          rotationAngle: 0,
          lowPolyMode: false,
          textPlatformHeightOverride: undefined
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

    render(<PreviewPage />);

    // Open the text height control panel
    const textHeightToolbarBtn = screen.getByTitle('Override text platform height');
    expect(textHeightToolbarBtn).toBeInTheDocument();
    fireEvent.click(textHeightToolbarBtn);

    // Check for text height control elements
    expect(screen.getByText('Text Platform Height')).toBeInTheDocument();
    expect(screen.getByTitle('Auto (default)')).toBeInTheDocument();
    expect(screen.getByTitle('Low (5mm)')).toBeInTheDocument();
    expect(screen.getByTitle('Medium (10mm)')).toBeInTheDocument();
    expect(screen.getByTitle('High (20mm)')).toBeInTheDocument();

    // Test clicking a preset button
    const lowButton = screen.getByTitle('Low (5mm)');
    fireEvent.click(lowButton);

    expect(updateModelConfig).toHaveBeenCalledWith({ textPlatformHeightOverride: 5 });
    expect(updateModel).toHaveBeenCalled();
  });

  it('hides text height control when no emboss text is present', () => {
    // Override the context without emboss text
    vi.spyOn(AppContext, 'useAppContext').mockReturnValue({
      state: {
        ui: { loading: false, status: '' },
        modelConfig: { 
          shape: 'hexagon' as ShapeType, 
          widthMM: 100, 
          altMult: 1,
          modelResolution: 500,
          paddingFactor: 4.0,
          embossText: '', // Empty text
          rotationAngle: 0,
          lowPolyMode: false,
          textPlatformHeightOverride: undefined
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
    });

    render(<PreviewPage />);

    // Text height control should not be present
    const textHeightToolbarBtn = screen.queryByTitle('Override text platform height');
    expect(textHeightToolbarBtn).not.toBeInTheDocument();
  });

  it('handles rotation angle change via slider', () => {
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
          modelResolution: 500,
          paddingFactor: 4.0,
          embossText: '',
          rotationAngle: 0,
          lowPolyMode: false,
          textPlatformHeightOverride: undefined
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

    // Open the rotation control panel
    const rotationToolbarBtn = screen.getByTitle('Rotate your model');
    fireEvent.click(rotationToolbarBtn);

    // Find the rotation slider
    const rotationSlider = screen.getByRole('slider', { name: 'Fine adjust rotation angle' });
    
    // Test changing rotation angle
    fireEvent.change(rotationSlider, { target: { value: '45' } });
    expect(updateModelConfig).toHaveBeenCalledWith({ rotationAngle: 45 });
    
    // Simulate end of sliding to trigger update
    fireEvent.mouseUp(rotationSlider);
    expect(updateModel).toHaveBeenCalled();
  });

  it('displays geometric rotation preset buttons', () => {
    const updateModelConfig = vi.fn();
    const updateModel = vi.fn();
    
    // Override model builder hook
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
          modelResolution: 500,
          paddingFactor: 4.0,
          embossText: '',
          rotationAngle: 0,
          lowPolyMode: false,
          textPlatformHeightOverride: undefined
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

    render(<PreviewPage />);

    // Open the rotation control panel
    const rotationToolbarBtn = screen.getByTitle('Rotate your model');
    fireEvent.click(rotationToolbarBtn);

    // Check for all geometric preset buttons
    expect(screen.getByTitle('Original orientation (0°)')).toBeInTheDocument();
    expect(screen.getByTitle('30° - Half hexagon side')).toBeInTheDocument();
    expect(screen.getByTitle('45° - Square/rectangle diagonal')).toBeInTheDocument();
    expect(screen.getByTitle('60° - Hexagon side alignment')).toBeInTheDocument();
    expect(screen.getByTitle('90° - Quarter turn')).toBeInTheDocument();
    expect(screen.getByTitle('120° - Hexagon vertex alignment')).toBeInTheDocument();
  });

  it('handles rotation preset button clicks', () => {
    const updateModelConfig = vi.fn();
    const updateModel = vi.fn();
    
    // Override model builder hook
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
          modelResolution: 500,
          paddingFactor: 4.0,
          embossText: '',
          rotationAngle: 0,
          lowPolyMode: false,
          textPlatformHeightOverride: undefined
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

    render(<PreviewPage />);

    // Open the rotation control panel
    const rotationToolbarBtn = screen.getByTitle('Rotate your model');
    fireEvent.click(rotationToolbarBtn);

    // Test clicking the 60° hexagon preset
    const hexagonPresetBtn = screen.getByTitle('60° - Hexagon side alignment');
    fireEvent.click(hexagonPresetBtn);
    
    expect(updateModelConfig).toHaveBeenCalledWith({ rotationAngle: 60 });
    expect(updateModel).toHaveBeenCalled();

    // Clear previous calls
    updateModelConfig.mockClear();
    updateModel.mockClear();

    // Test clicking the 45° square preset
    const squarePresetBtn = screen.getByTitle('45° - Square/rectangle diagonal');
    fireEvent.click(squarePresetBtn);
    
    expect(updateModelConfig).toHaveBeenCalledWith({ rotationAngle: 45 });
    expect(updateModel).toHaveBeenCalled();
  });

  it('shows active state for current rotation angle preset', () => {
    // Override the context with a specific rotation angle
    vi.spyOn(AppContext, 'useAppContext').mockReturnValue({
      state: {
        ui: { loading: false, status: '' },
        modelConfig: { 
          shape: 'hexagon' as ShapeType, 
          widthMM: 100, 
          altMult: 1,
          modelResolution: 500,
          paddingFactor: 4.0,
          embossText: '',
          rotationAngle: 60, // Set to 60 degrees
          lowPolyMode: false,
          textPlatformHeightOverride: undefined
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
    });

    render(<PreviewPage />);

    // Open the rotation control panel
    const rotationToolbarBtn = screen.getByTitle('Rotate your model');
    fireEvent.click(rotationToolbarBtn);

    // The 60° button should have the active class
    const hexagonPresetBtn = screen.getByTitle('60° - Hexagon side alignment');
    expect(hexagonPresetBtn).toHaveClass('active');
    
    // Other buttons should not be active
    const originalBtn = screen.getByTitle('Original orientation (0°)');
    expect(originalBtn).not.toHaveClass('active');
  });

  it('displays rotation description text', () => {
    render(<PreviewPage />);

    // Open the rotation control panel
    const rotationToolbarBtn = screen.getByTitle('Rotate your model');
    fireEvent.click(rotationToolbarBtn);

    // Check for the geometric description text
    expect(screen.getByText('Choose angles optimized for hexagons and rectangles, or fine-tune below.')).toBeInTheDocument();
  });
}); 