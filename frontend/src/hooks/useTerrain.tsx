import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import GPXParser from '../lib/GPXParser';
import TerrainGenerator from '../lib/TerrainGenerator';

export const useTerrain = () => {
  const { state, dispatch, setLoading } = useAppContext();
  const { file, resources, modelConfig } = state;
  const { font, terrainData } = resources;

  const generateTerrain = useCallback(async () => {
    if (!file) { 
      dispatch({ type: 'SET_STATUS', payload: 'Select a GPX file' });
      return; 
    }
    
    if (!font && modelConfig.embossText) { 
      dispatch({ type: 'SET_STATUS', payload: 'Font loading, please wait' });
      return; 
    }
    
    setLoading(true, 'Parsing GPX...');
    
    try {
      if (!terrainData) {
        const text = await file.text();
        const points = GPXParser.parse(text, 10);
        
        setLoading(true, 'Getting terrain data...');
            const paddingFactor = modelConfig.paddingFactor ?? modelConfig.paddingFactor;
    const data = await TerrainGenerator.generate(points, modelConfig.modelResolution, paddingFactor);
        dispatch({ type: 'SET_TERRAIN_DATA', payload: data });
      }
    } catch (err: unknown) {
      dispatch({ 
        type: 'SET_STATUS', 
        payload: err instanceof Error ? err.message : String(err) 
      });
    } finally {
      setLoading(false);
    }
  }, [file, font, modelConfig.embossText, modelConfig.modelResolution, modelConfig.paddingFactor, terrainData, dispatch, setLoading]);

  return { generateTerrain };
}; 