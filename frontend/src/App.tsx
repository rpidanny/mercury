import React, { useReducer, useEffect } from 'react';
import GPXParser from './lib/GPXParser';
import TerrainGenerator from './lib/TerrainGenerator';
import type { TerrainData } from './lib/TerrainGenerator';
import ModelBuilder from './lib/ModelBuilder';
import Config from './lib/config';
import { ShapeType } from './lib/types';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import type { Object3D } from 'three';
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
  mesh: Object3D | null;
  terrainData: TerrainData | null;
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
  | { type: 'SET_MESH', payload: Object3D | null }
  | { type: 'SET_TERRAIN_DATA', payload: TerrainData | null };

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
  mesh: null,
  terrainData: null
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
    case 'SET_MESH': return { ...state, mesh: action.payload };
    case 'SET_TERRAIN_DATA': return { ...state, terrainData: action.payload };
    default: return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { 
    file, shape, widthMM, altMult, gridRes, paddingFac, 
    embossText, status, loading, font, mesh, terrainData 
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
      
      dispatch({ type: 'SET_STATUS', payload: 'Building 3D model...' });
      const result = ModelBuilder.build(
        data!,
        widthMM,
        altMult,
        shape,
        embossText,
        font
      );
      
      dispatch({ type: 'SET_MESH', payload: result.mesh });
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

  const handleUpdateModel = async () => {
    if (!terrainData) {
      dispatch({ type: 'SET_STATUS', payload: 'No terrain data available, please regenerate' });
      return;
    }
    if (!font && embossText) {
      dispatch({ type: 'SET_STATUS', payload: 'Font loading, please wait' });
      return;
    }
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      dispatch({ type: 'SET_STATUS', payload: 'Building 3D model...' });
      const result = ModelBuilder.build(
        terrainData,
        widthMM,
        altMult,
        shape,
        embossText,
        font
      );
      dispatch({ type: 'SET_MESH', payload: result.mesh });
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

  const handleDownload = () => {
    if (!mesh) return;
    const exporter = new STLExporter();
    const stlString = exporter.parse(mesh);
    const blob = new Blob([stlString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.stl';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <LoadingModal message={status || (loading ? 'Loading...' : null)} />
      {mesh ? (
        <PreviewPage
          mesh={mesh}
          onDownload={handleDownload}
          shape={shape}
          onShapeChange={(shape) => dispatch({ type: 'SET_SHAPE', payload: shape })}
          widthMM={widthMM}
          onWidthChange={(v) => dispatch({ type: 'SET_WIDTH_MM', payload: v })}
          altMult={altMult}
          onAltMultChange={(v) => dispatch({ type: 'SET_ALT_MULT', payload: v })}
          onRegenerate={handleUpdateModel}
          loading={loading}
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
