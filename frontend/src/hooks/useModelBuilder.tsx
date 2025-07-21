import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Object3D } from 'three';
import Renderer from '../lib/Renderer';
import ModelBuilder from '../lib/ModelBuilder';
import { STLExporter } from '../lib/STLExporter';

export const useModelBuilder = () => {
  const { state, setLoading } = useAppContext();
  const { resources, modelConfig } = state;
  const { terrainData, font, fonts } = resources;
  const { widthMM, altMult, shape, embossText, rotationAngle, lowPolyMode, textPlatformHeightOverride, selectedFontKey, fontBold } = modelConfig;
  
  // Get the currently selected font variant, fallback to default font if not loaded yet
  const fontVariantKey = `${selectedFontKey}_${fontBold ? 'bold' : 'regular'}`;
  const currentFont = fonts[fontVariantKey] || font;
  
  const [localMesh, setLocalMesh] = useState<Object3D | null>(null);
  const [pendingChanges, setPendingChanges] = useState<boolean>(false);
  const rendererRef = useRef<Renderer | null>(null);
  const stlExporterRef = useRef<STLExporter | null>(null);
  const [isRendererInitialized, setIsRendererInitialized] = useState<boolean>(false);
  const initialRenderComplete = useRef<boolean>(false);
  const isBuildingModel = useRef<boolean>(false);

  // Initialize renderer and STL exporter on mount
  useEffect(() => {
    document.body.classList.add('model-mode');
    
    if (!rendererRef.current) {
      const renderer = new Renderer('#scene-container');
      rendererRef.current = renderer;
      setIsRendererInitialized(true);
    }

    if (!stlExporterRef.current) {
      stlExporterRef.current = new STLExporter();
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
              currentFont,
              rotationAngle,
              lowPolyMode,
              textPlatformHeightOverride
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
  }, [terrainData, pendingChanges, widthMM, altMult, shape, embossText, currentFont, selectedFontKey, fontBold, rotationAngle, lowPolyMode, textPlatformHeightOverride, setLoading, isRendererInitialized, localMesh]);
  
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

  // Generate filename for STL export
  const generateFileName = useCallback((): string => {
    const originalFileName = state.file?.name.replace(/\.[^/.]+$/, '') || 'model';
    const { modelResolution, paddingFactor } = modelConfig;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    
    return `${originalFileName}_res${modelResolution}_pad${paddingFactor}_${timestamp}.stl`;
  }, [state.file, modelConfig]);

  // Handle download functionality using the STL exporter with progress callbacks
  const downloadModel = useCallback(async () => {
    if (!localMesh || !stlExporterRef.current) return;

    try {
      // Generate STL string using the STL exporter class with progress callbacks
      const stlString = await stlExporterRef.current.generateSTL(localMesh, {
        callbacks: {
          onCollectingGeometries: async () => {
            setLoading(true, 'Collecting mesh geometries...');
            await new Promise(resolve => setTimeout(resolve, 200)); // Allow UI to update
          },
          onProcessingOrientations: async () => {
            setLoading(true, 'Processing face orientations...');
            await new Promise(resolve => setTimeout(resolve, 200)); // Allow UI to update
          },
          onCreatingManifold: async () => {
            setLoading(true, 'Creating manifold mesh...');
            await new Promise(resolve => setTimeout(resolve, 200)); // Allow UI to update
          },
          onRemovingDegenerateTriangles: async () => {
            setLoading(true, 'Optimizing geometry...');
            await new Promise(resolve => setTimeout(resolve, 200)); // Allow UI to update
          },
          onGeneratingSTL: async () => {
            setLoading(true, 'Generating STL format...');
            await new Promise(resolve => setTimeout(resolve, 200)); // Allow UI to update
          }
        }
      });
      
      setLoading(true, 'Preparing download...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create blob and download
      const blob = new Blob([stlString], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = generateFileName();
      link.click();
      
      // Cleanup
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
      setLoading(true, `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setLoading(false), 10_000);
      return;
    }

    // Add delay before removing loading state
    await new Promise(resolve => setTimeout(resolve, 300));
    setLoading(false);
  }, [localMesh, generateFileName, setLoading]);

  return {
    localMesh,
    updateModel,
    downloadModel
  };
}; 