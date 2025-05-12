import { useReducer, useEffect } from 'react';

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
  shape: ShapeType;
  widthMM: number;
  altMult: number;
  gridRes: number;
  paddingFac: number;
  embossText: string;
  status: string;
  loading: boolean;
  font: Font | null;
  terrainData: TerrainData | null;
  rotationAngle: number;
};

type AppAction = 
  | { type: 'SET_FILE', payload: File | null }
  | { type: 'SET_SHAPE', payload: ShapeType }
  | { type: 'SET_WIDTH_MM', payload: number }
  | { type: 'SET_ALT_MULT', payload: number }
  | { type: 'SET_GRID_RES', payload: number }
  | { type: 'SET_PADDING_FAC', payload: number }
  | { type: 'SET_EMBOSS_TEXT', payload: string }
  | { type: 'SET_STATUS', payload: string }
  | { type: 'SET_LOADING', payload: boolean }
  | { type: 'SET_FONT', payload: Font | null }
  | { type: 'SET_TERRAIN_DATA', payload: TerrainData | null }
  | { type: 'SET_ROTATION_ANGLE', payload: number };

// Initial state
const initialState: AppState = {
  file: null,
  shape: 'hexagon',
  widthMM: 100,
  altMult: 1,
  gridRes: 500,
  paddingFac: 4.0,
  embossText: '',
  status: '',
  loading: false,
  font: null,
  terrainData: null,
  rotationAngle: 0
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_FILE': return { ...state, file: action.payload };
    case 'SET_SHAPE': return { ...state, shape: action.payload };
    case 'SET_WIDTH_MM': return { ...state, widthMM: action.payload };
    case 'SET_ALT_MULT': return { ...state, altMult: action.payload };
    case 'SET_GRID_RES': return { ...state, gridRes: action.payload };
    case 'SET_PADDING_FAC': return { ...state, paddingFac: action.payload };
    case 'SET_EMBOSS_TEXT': return { ...state, embossText: action.payload };
    case 'SET_STATUS': return { ...state, status: action.payload };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'SET_FONT': return { ...state, font: action.payload };
    case 'SET_TERRAIN_DATA': return { ...state, terrainData: action.payload };
    case 'SET_ROTATION_ANGLE': return { ...state, rotationAngle: action.payload };
    default: return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { 
    file, shape, widthMM, altMult, gridRes, paddingFac, 
    embossText, status, loading, font, terrainData, rotationAngle 
  } = state;

  // Load font on mount
  useEffect(() => {
    const loader = new FontLoader();
    loader.load(
      Config.FONT_URL,
      (f: Font) => dispatch({ type: 'SET_FONT', payload: f }),
      undefined,
      () => dispatch({ type: 'SET_STATUS', payload: 'Error loading font, emboss disabled' })
    );
  }, []);

  const handleGenerate = async () => {
    if (!file) { 
      dispatch({ type: 'SET_STATUS', payload: 'Select a GPX file' });
      return; 
    }
    if (!font && embossText) { 
      dispatch({ type: 'SET_STATUS', payload: 'Font loading, please wait' });
      return; 
    }
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      let data = terrainData;
      if (!data) {
        dispatch({ type: 'SET_STATUS', payload: 'Parsing GPX...' });
        const text = await file.text();
        const pts = GPXParser.parse(text, 10);
        
        dispatch({ type: 'SET_STATUS', payload: 'Generating terrain...' });
        data = await TerrainGenerator.generate(pts, gridRes, paddingFac);
        dispatch({ type: 'SET_TERRAIN_DATA', payload: data });
      }
      
      // No need to build model here - PreviewPage will handle it
      dispatch({ type: 'SET_STATUS', payload: '' });
    } catch (err: unknown) {
      dispatch({ 
        type: 'SET_STATUS', 
        payload: err instanceof Error ? err.message : String(err) 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleReset = () => {
    dispatch({ type: 'SET_TERRAIN_DATA', payload: null });
  };

  const setLoading = (isLoading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: isLoading });
  };

  const setStatus = (statusText: string) => {
    dispatch({ type: 'SET_STATUS', payload: statusText });
  };

  return (
    <>
      <LoadingModal message={status || (loading ? 'Loading...' : null)} />
      {terrainData ? (
        <PreviewPage
          terrainData={terrainData}
          font={font}
          embossText={embossText}
          initialShape={shape}
          initialWidthMM={widthMM}
          initialAltMult={altMult}
          initialRotationAngle={rotationAngle}
          loading={loading}
          setLoading={setLoading}
          setStatus={setStatus}
          loadingStatus={status}
          onReset={handleReset}
        />
      ) : (
        <HomePage
          onFileChange={(file) => dispatch({ type: 'SET_FILE', payload: file })}
          shape={shape}
          onShapeChange={(shape) => dispatch({ type: 'SET_SHAPE', payload: shape })}
          widthMM={widthMM}
          onWidthChange={(v) => dispatch({ type: 'SET_WIDTH_MM', payload: v })}
          altMult={altMult}
          onAltMultChange={(v) => dispatch({ type: 'SET_ALT_MULT', payload: v })}
          gridRes={gridRes}
          onGridResChange={(v) => dispatch({ type: 'SET_GRID_RES', payload: v })}
          paddingFac={paddingFac}
          onPaddingFacChange={(v) => dispatch({ type: 'SET_PADDING_FAC', payload: v })}
          embossText={embossText}
          onEmbossTextChange={(text) => dispatch({ type: 'SET_EMBOSS_TEXT', payload: text })}
          loading={loading}
          onGenerate={handleGenerate}
        />
      )}
    </>
  );
}

export default App;
