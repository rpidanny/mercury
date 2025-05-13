import { createContext, useContext, useReducer, ReactNode, Dispatch, useCallback } from 'react';
import { ShapeType } from '../lib/types';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TerrainData } from '../lib/TerrainGenerator';

type AppState = {
  file: File | null;
  modelConfig: {
    shape: ShapeType;
    widthMM: number;
    altMult: number;
    gridRes: number;
    coverageFactor: number;
    coverageFactor?: number;
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
    coverageFactor: 4.0,
    coverageFactor: 4.0,
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
    
    case 'UPDATE_MODEL_CONFIG': {
      const payload = { ...action.payload };
      if ('coverageFactor' in payload) {
        payload.coverageFactor = payload.coverageFactor;
      } else if ('coverageFactor' in payload) {
        payload.coverageFactor = payload.coverageFactor;
      }
      
      return { 
        ...state, 
        modelConfig: { ...state.modelConfig, ...payload } 
      };
    }
    
    case 'SET_STATUS': 
      return { 
        ...state, 
        ui: { ...state.ui, status: action.payload } 
      };
    
    case 'SET_LOADING': 
      return { 
        ...state, 
        ui: { ...state.ui, loading: action.payload } 
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
        resources: { ...state.resources, font: action.payload } 
      };
    
    case 'SET_TERRAIN_DATA': 
      return { 
        ...state, 
        resources: { ...state.resources, terrainData: action.payload } 
      };
    
    case 'RESET_TERRAIN': 
      return { 
        ...state, 
        resources: { ...state.resources, terrainData: null } 
      };
    
    default: 
      return state;
  }
}

type AppContextType = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  updateModelConfig: (updates: Partial<AppState['modelConfig']>) => void;
  setLoading: (isLoading: boolean, message?: string) => void;
  resetTerrain: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const updateModelConfig = useCallback((updates: Partial<AppState['modelConfig']>) => {
    dispatch({ type: 'UPDATE_MODEL_CONFIG', payload: updates });
  }, []);

  const setLoading = useCallback((isLoading: boolean, message?: string) => {
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

  const resetTerrain = useCallback(() => {
    dispatch({ type: 'RESET_TERRAIN' });
  }, []);

  return (
    <AppContext.Provider value={{ 
      state, 
      dispatch, 
      updateModelConfig, 
      setLoading, 
      resetTerrain 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}; 