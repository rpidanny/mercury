import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useAppContext } from './AppContext';
import { ReactNode } from 'react';
import createMockTerrainData from '../test-utils/mockTerrainData';

// Test wrapper component for the hooks
const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('AppContext', () => {
  it('provides initial state values', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    
    // Check initial state values
    expect(result.current.state.file).toBeNull();
    expect(result.current.state.modelConfig.shape).toBe('hexagon');
    expect(result.current.state.modelConfig.widthMM).toBe(100);
    expect(result.current.state.ui.loading).toBe(false);
    expect(result.current.state.ui.status).toBe('');
    expect(result.current.state.resources.terrainData).toBeNull();
    expect(result.current.state.resources.font).toBeNull();
  });

  it('updates model config correctly', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    
    act(() => {
      result.current.updateModelConfig({ widthMM: 200, shape: 'circle' });
    });
    
    expect(result.current.state.modelConfig.widthMM).toBe(200);
    expect(result.current.state.modelConfig.shape).toBe('circle');
  });

  it('sets loading state correctly', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    
    // Test simple loading state
    act(() => {
      result.current.setLoading(true);
    });
    
    expect(result.current.state.ui.loading).toBe(true);
    expect(result.current.state.ui.status).toBe('');
    
    // Test loading with message
    act(() => {
      result.current.setLoading(true, 'Processing data...');
    });
    
    expect(result.current.state.ui.loading).toBe(true);
    expect(result.current.state.ui.status).toBe('Processing data...');
    
    // Test turning off loading
    act(() => {
      result.current.setLoading(false);
    });
    
    expect(result.current.state.ui.loading).toBe(false);
    expect(result.current.state.ui.status).toBe('');
  });

  it('resets terrain data correctly', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });
    
    // First set some terrain data with dispatch
    act(() => {
      result.current.dispatch({ 
        type: 'SET_TERRAIN_DATA', 
        payload: createMockTerrainData()
      });
    });
    
    // Verify it was set
    expect(result.current.state.resources.terrainData).not.toBeNull();
    
    // Reset terrain data
    act(() => {
      result.current.resetTerrain();
    });
    
    // Verify it was reset
    expect(result.current.state.resources.terrainData).toBeNull();
  });
}); 