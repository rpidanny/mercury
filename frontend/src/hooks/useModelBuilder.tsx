import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Object3D } from 'three';
import Renderer from '../lib/Renderer';
import ModelBuilder from '../lib/ModelBuilder';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

export const useModelBuilder = () => {
  const { state, setLoading } = useAppContext();
  const { resources, modelConfig } = state;
  const { terrainData, font } = resources;
  const { widthMM, altMult, shape, embossText, rotationAngle, lowPolyMode } = modelConfig;
  
  const [localMesh, setLocalMesh] = useState<Object3D | null>(null);
  const [pendingChanges, setPendingChanges] = useState<boolean>(false);
  const rendererRef = useRef<Renderer | null>(null);
  const [isRendererInitialized, setIsRendererInitialized] = useState<boolean>(false);
  const initialRenderComplete = useRef<boolean>(false);
  const isBuildingModel = useRef<boolean>(false);

  // Initialize renderer on mount
  useEffect(() => {
    document.body.classList.add('model-mode');
    
    if (!rendererRef.current) {
      const renderer = new Renderer('#scene-container');
      rendererRef.current = renderer;
      setIsRendererInitialized(true);
    }
    
    return () => {
      document.body.classList.remove('model-mode');
    };
  }, []);

  // Build model when needed or when params change
  useEffect(() => {
    if (!terrainData || !isRendererInitialized || isBuildingModel.current) return;
    
    const buildModel = async () => {
      if (!localMesh) {
        setLoading(true, 'Building 3D model...');
      }

      isBuildingModel.current = true;
      
      try {
        // Ensure the loading state has time to be applied to the UI
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Wrap model building in a Promise to make it asynchronous
        const result = await new Promise<{ mesh: Object3D }>((resolve) => {
          requestAnimationFrame(() => {
            const modelResult = ModelBuilder.build(
              terrainData,
              widthMM,
              altMult,
              shape,
              embossText,
              font,
              rotationAngle,
              lowPolyMode
            );
            resolve(modelResult);
          });
        });
        
        setLocalMesh(result.mesh);
        
        // Directly render the mesh for the first time
        if (!initialRenderComplete.current && rendererRef.current) {
          rendererRef.current.renderMesh(result.mesh);
          initialRenderComplete.current = true;
        }
      } catch (err: unknown) {
        setLoading(true, err instanceof Error ? err.message : String(err));
      } finally {
        setTimeout(() => {
          setLoading(false);
          setPendingChanges(false);
          isBuildingModel.current = false;
        }, 300);
      }
    };
    
    if (!initialRenderComplete.current || pendingChanges) {
      buildModel();
    }
  }, [terrainData, pendingChanges, widthMM, altMult, shape, embossText, font, rotationAngle, lowPolyMode, setLoading, isRendererInitialized, localMesh]);
  
  // Update renderer when mesh changes after initial render
  useEffect(() => {
    if (rendererRef.current && localMesh && initialRenderComplete.current) {
      rendererRef.current.updateMeshPreserveCamera(localMesh);
    }
  }, [localMesh]);

  const updateModel = useCallback(() => {
    setPendingChanges(true);
    setLoading(true, 'Updating model...');
  }, [setLoading]);

  // Handle download functionality
  const downloadModel = useCallback(async () => {
    if (!localMesh) return;

    setLoading(true, 'Compacting 3D model...');

    // Add a small delay to ensure loading state is applied in the UI
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const exporter = new STLExporter();
    const stlString = exporter.parse(localMesh);
    const blob = new Blob([stlString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Get the original filename from the GPX file
    const originalFileName = state.file?.name.replace(/\.[^/.]+$/, '') || 'model';
    
    // Get render configs
    const { gridRes, coverageFactor } = modelConfig;
    
    // Create timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    
    // Construct the filename with configs and timestamp
    a.download = `${originalFileName}_res${gridRes}_pad${coverageFactor}_${timestamp}.stl`;
    
    a.click();
    URL.revokeObjectURL(url);

    // Add delay before removing loading state
    await new Promise(resolve => setTimeout(resolve, 300));
    setLoading(false);
  }, [localMesh, state.file, modelConfig, setLoading]);

  return {
    localMesh,
    updateModel,
    downloadModel
  };
}; 