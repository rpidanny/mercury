import { useReducer, useEffect, useCallback } from 'react';

import GPXParser from './lib/GPXParser';
import TerrainGenerator from './lib/TerrainGenerator';
import type { TerrainData } from './lib/TerrainGenerator';
import Config from './lib/config';
import { ShapeType } from './lib/types';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import './index.css';
import HomePage from './Pages/HomePage/HomePage';
import PreviewPage from './Pages/PreviewPage/PreviewPage';
import LoadingModal from './components/LoadingModal';

// Define app state and action types
type AppState = {
  file: File | null;
  modelConfig: {
    shape: ShapeType;
    widthMM: number;
    altMult: number;
    gridRes: number;
    paddingFac: number;
    embossText: string;
    rotationAngle: number;
  };
  ui: {
    status: string;
    loading: boolean;
  };
  resources: {
    font: Font | null;
    terrainData: TerrainData | null;
  };
};

type AppAction = 
  | { type: 'SET_FILE', payload: File | null }
  | { type: 'UPDATE_MODEL_CONFIG', payload: Partial<AppState['modelConfig']> }
  | { type: 'SET_STATUS', payload: string }
  | { type: 'SET_LOADING', payload: boolean }
  | { type: 'SET_LOADING_WITH_STATUS', payload: { loading: boolean, status: string } }
  | { type: 'SET_FONT', payload: Font | null }
  | { type: 'SET_TERRAIN_DATA', payload: TerrainData | null }
  | { type: 'RESET_TERRAIN' };

// Initial state
const initialState: AppState = {
  file: null,
  modelConfig: {
    shape: 'hexagon',
    widthMM: 100,
    altMult: 1,
    gridRes: 500,
    paddingFac: 4.0,
    embossText: '',
    rotationAngle: 0
  },
  ui: {
    status: '',
    loading: false
  },
  resources: {
    font: null,
    terrainData: null
  }
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_FILE': 
      return { ...state, file: action.payload };
    
    case 'UPDATE_MODEL_CONFIG': 
      return { 
        ...state, 
        modelConfig: { 
          ...state.modelConfig, 
          ...action.payload 
        } 
      };
    
    case 'SET_STATUS': 
      return { 
        ...state, 
        ui: { 
          ...state.ui, 
          status: action.payload 
        } 
      };
    
    case 'SET_LOADING': 
      return { 
        ...state, 
        ui: { 
          ...state.ui, 
          loading: action.payload 
        } 
      };
    
    case 'SET_LOADING_WITH_STATUS': 
      return { 
        ...state, 
        ui: { 
          loading: action.payload.loading, 
          status: action.payload.status 
        } 
      };
    
    case 'SET_FONT': 
      return { 
        ...state, 
        resources: { 
          ...state.resources, 
          font: action.payload 
        } 
      };
    
    case 'SET_TERRAIN_DATA': 
      return { 
        ...state, 
        resources: { 
          ...state.resources, 
          terrainData: action.payload 
        } 
      };
    
    case 'RESET_TERRAIN': 
      return { 
        ...state, 
        resources: { 
          ...state.resources, 
          terrainData: null 
        } 
      };
    
    default: 
      return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { file, modelConfig, ui, resources } = state;
  const { loading, status } = ui;
  const { font, terrainData } = resources;

  // Load font on mount
  useEffect(() => {
    const loader = new FontLoader();
    loader.load(
      Config.FONT_URL,
      (loadedFont: Font) => dispatch({ type: 'SET_FONT', payload: loadedFont }),
      undefined,
      () => dispatch({ type: 'SET_STATUS', payload: 'Error loading font, emboss disabled' })
    );
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!file) { 
      dispatch({ type: 'SET_STATUS', payload: 'Select a GPX file' });
      return; 
    }
    
    if (!font && modelConfig.embossText) { 
      dispatch({ type: 'SET_STATUS', payload: 'Font loading, please wait' });
      return; 
    }
    
    dispatch({ type: 'SET_LOADING_WITH_STATUS', payload: { loading: true, status: 'Parsing GPX...' } });
    
    try {
      if (!terrainData) {
        const text = await file.text();
        const points = GPXParser.parse(text, 10);
        
        dispatch({ type: 'SET_LOADING_WITH_STATUS', payload: { loading: true, status: 'Getting terrain data...' } });
        const data = await TerrainGenerator.generate(points, modelConfig.gridRes, modelConfig.paddingFac);
        dispatch({ type: 'SET_TERRAIN_DATA', payload: data });
      }
      
      dispatch({ type: 'SET_STATUS', payload: '' });
    } catch (err: unknown) {
      dispatch({ 
        type: 'SET_STATUS', 
        payload: err instanceof Error ? err.message : String(err) 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [file, font, modelConfig.embossText, modelConfig.gridRes, modelConfig.paddingFac, terrainData]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET_TERRAIN' });
  }, []);

  const handleSetLoading = useCallback((isLoading: boolean, message?: string) => {
    if (message) {
      dispatch({ 
        type: 'SET_LOADING_WITH_STATUS', 
        payload: { loading: isLoading, status: message } 
      });
    } else {
      dispatch({ type: 'SET_LOADING', payload: isLoading });
      if (!isLoading) {
        dispatch({ type: 'SET_STATUS', payload: '' });
      }
    }
  }, []);

  const updateModelConfig = useCallback((updates: Partial<AppState['modelConfig']>) => {
    dispatch({ type: 'UPDATE_MODEL_CONFIG', payload: updates });
  }, []);

  return (
    <>
      <LoadingModal message={status || (loading ? 'Loading...' : null)} />
      
      {terrainData ? (
        <PreviewPage
          terrainData={terrainData}
          font={font}
          embossText={modelConfig.embossText}
          initialShape={modelConfig.shape}
          initialWidthMM={modelConfig.widthMM}
          initialAltMult={modelConfig.altMult}
          initialRotationAngle={modelConfig.rotationAngle}
          loading={loading}
          setLoading={handleSetLoading}
          onReset={handleReset}
        />
      ) : (
        <HomePage
          onFileChange={(file) => dispatch({ type: 'SET_FILE', payload: file })}
          shape={modelConfig.shape}
          onShapeChange={(shape) => updateModelConfig({ shape })}
          widthMM={modelConfig.widthMM}
          onWidthChange={(widthMM) => updateModelConfig({ widthMM })}
          altMult={modelConfig.altMult}
          onAltMultChange={(altMult) => updateModelConfig({ altMult })}
          gridRes={modelConfig.gridRes}
          onGridResChange={(gridRes) => updateModelConfig({ gridRes })}
          paddingFac={modelConfig.paddingFac}
          onPaddingFacChange={(paddingFac) => updateModelConfig({ paddingFac })}
          embossText={modelConfig.embossText}
          onEmbossTextChange={(embossText) => updateModelConfig({ embossText })}
          loading={loading}
          onGenerate={handleGenerate}
        />
      )}
    </>
  );
}

export default App;
