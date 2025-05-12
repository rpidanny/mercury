import { vi } from 'vitest';
import createMockTerrainData from './test-utils/mockTerrainData';

// Mock the context and components to simplify testing
vi.mock('./context/AppContext', () => {
  const original = vi.importActual('./context/AppContext');
  const mockDispatch = vi.fn();
  const mockContext = {
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
  };
  
  return {
    ...original,
    useAppContext: () => mockContext,
    AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
  };
});

// Mock the HomePage and PreviewPage components
vi.mock('./Pages/HomePage/HomePage', () => ({
  default: () => <div data-testid="home-page">HomePage Mock</div>
}));

vi.mock('./Pages/PreviewPage/PreviewPage', () => ({
  default: () => <div data-testid="preview-page">PreviewPage Mock</div>
}));

// Mock THREE.js and related imports
vi.mock('three', async () => {
  return {
    Object3D: vi.fn().mockImplementation(() => ({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      add: vi.fn(),
    })),
    Scene: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      children: [],
      background: null,
    })),
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      setSize: vi.fn(),
      render: vi.fn(),
      domElement: document.createElement('canvas'),
      dispose: vi.fn(),
    })),
    PerspectiveCamera: vi.fn().mockImplementation(() => ({
      position: { x: 0, y: 0, z: 0 },
      aspect: 1,
      updateProjectionMatrix: vi.fn(),
    })),
    AmbientLight: vi.fn(),
    DirectionalLight: vi.fn(),
    Vector3: vi.fn().mockImplementation((x, y, z) => ({ x, y, z })),
    Color: vi.fn().mockImplementation(() => ({ r: 0, g: 0, b: 0 })),
    BufferGeometry: vi.fn().mockImplementation(() => ({
      setIndex: vi.fn(),
      setAttribute: vi.fn(),
    })),
    BufferAttribute: vi.fn(),
    Box3: vi.fn().mockImplementation(() => ({
      setFromObject: vi.fn(),
      getCenter: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
      getSize: vi.fn().mockReturnValue({ x: 10, y: 10, z: 10 }),
    })),
  };
});

// Mock the FontLoader
vi.mock('three/examples/jsm/loaders/FontLoader.js', () => {
  const mockFont = {
    isFont: true,
    type: 'Font',
    data: {},
    generateShapes: vi.fn().mockReturnValue([]),
  };
  
  return {
    FontLoader: class MockFontLoader {
      load(_url: string, onLoad: (font: typeof mockFont) => void): typeof mockFont {
        setTimeout(() => onLoad(mockFont), 0);
        return mockFont;
      }
    }
  };
});

// Mock STLExporter
vi.mock('three/examples/jsm/exporters/STLExporter.js', () => ({
  STLExporter: class MockSTLExporter {
    parse(): string {
      return 'mock-stl-content';
    }
  }
}));

// Mock other modules
vi.mock('./lib/GPXParser', () => ({
  default: {
    parse: vi.fn().mockReturnValue([
      { lat: 37.7749, lon: -122.4194, alt: 0 },
      { lat: 37.7750, lon: -122.4195, alt: 10 }
    ])
  }
}));

vi.mock('./lib/TerrainGenerator', () => ({
  default: {
    generate: vi.fn().mockResolvedValue(createMockTerrainData())
  }
}));

vi.mock('./lib/ModelBuilder', () => ({
  default: {
    build: vi.fn().mockReturnValue({
      mesh: { position: { x: 0, y: 0, z: 0 } }
    })
  }
}));

// Mock hooks
vi.mock('./hooks/useTerrain', () => ({
  useTerrain: () => ({
    generateTerrain: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('./hooks/useModelBuilder', () => ({
  useModelBuilder: () => ({
    localMesh: { position: { x: 0, y: 0, z: 0 } },
    updateModel: vi.fn(),
    downloadModel: vi.fn()
  })
}));

// Import remaining modules
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import * as AppContext from './context/AppContext';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders HomePage when no terrain data is present', () => {
    // Make sure terrainData is null
    vi.spyOn(AppContext, 'useAppContext').mockReturnValueOnce({
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
    
    render(<App />);
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('renders PreviewPage when terrain data is present', async () => {
    // Override the context to include terrain data
    vi.spyOn(AppContext, 'useAppContext').mockReturnValueOnce({
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
        resources: { font: null, terrainData: createMockTerrainData() }
      },
      dispatch: vi.fn(),
      updateModelConfig: vi.fn(),
      setLoading: vi.fn(),
      resetTerrain: vi.fn()
    });
    
    render(<App />);
    expect(screen.getByTestId('preview-page')).toBeInTheDocument();
  });

  it('checks font loading mechanism', async () => {
    const mockDispatch = vi.fn();

    // Override context with our spy
    vi.spyOn(AppContext, 'useAppContext').mockReturnValueOnce({
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
    
    render(<App />);
    
    // The font loading is asynchronous, so we need to wait for it
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ 
          type: 'SET_FONT',
          payload: expect.objectContaining({ isFont: true })
        })
      );
    });
  });
}); 