import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Object3D, BufferGeometry, Mesh, Matrix4 } from 'three';
import Renderer from '../lib/Renderer';
import ModelBuilder from '../lib/ModelBuilder';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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

  // Merge all separate meshes into a single BufferGeometry for proper 3D printing
  const createSingleMeshForExport = useCallback((group: Object3D): BufferGeometry => {
    const geometries: BufferGeometry[] = [];
    
    // Traverse the group and collect all geometries
    group.traverse((child) => {
      if (child instanceof Mesh && child.geometry) {
        const geometry = child.geometry.clone();
        
        // Apply the mesh's world matrix to get correct positioning
        const worldMatrix = new Matrix4();
        child.updateWorldMatrix(true, false);
        worldMatrix.copy(child.matrixWorld);
        geometry.applyMatrix4(worldMatrix);
        
        // Remove UV coordinates and other non-essential attributes to ensure compatibility
        // STL export only needs position data
        const cleanGeometry = new THREE.BufferGeometry();
        
        // Copy only position attribute (required for STL)
        if (geometry.attributes.position) {
          cleanGeometry.setAttribute('position', geometry.attributes.position);
        }
        
        // Copy index if it exists
        if (geometry.index) {
          cleanGeometry.setIndex(geometry.index);
        }
        
        geometries.push(cleanGeometry);
      }
    });
    
    if (geometries.length === 0) {
      throw new Error('No geometries found to export');
    }
    
    // Merge all geometries into a single BufferGeometry
    const mergedGeometry = mergeGeometries(geometries, false);
    
    if (!mergedGeometry) {
      throw new Error('Failed to merge geometries');
    }
    
    // Ensure consistent winding and compute normals for proper 3D printing
    mergedGeometry.computeVertexNormals();
    
    return mergedGeometry;
  }, []);

  // Handle download functionality with proper mesh merging for 3D printing
  const downloadModel = useCallback(async () => {
    if (!localMesh) return;

    try {
      setLoading(true, 'Preparing 3D printable mesh...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create a single merged geometry for proper 3D printing
      const printableGeometry = createSingleMeshForExport(localMesh);
      
      // Create a temporary mesh with the merged geometry
      const printableMesh = new THREE.Mesh(printableGeometry);
      
      setLoading(true, 'Converting to STL format...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const exporter = new STLExporter();
      let stlString: string;
      
      try {
        stlString = exporter.parse(printableMesh);
      } catch (exportError) {
        console.error('STL export failed:', exportError);
        setLoading(true, `Export failed: ${exportError instanceof Error ? exportError.message : 'Unknown error'}`);
        setTimeout(() => setLoading(false), 3000);
        return;
      }

      setLoading(true, 'Saving file...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const blob = new Blob([stlString], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get the original filename from the GPX file
      const originalFileName = state.file?.name.replace(/\.[^/.]+$/, '') || 'model';
      
      // Get render configs
      const { modelResolution, paddingFactor } = modelConfig;
      
      // Create timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      
      // Construct the filename with configs and timestamp
      a.download = `${originalFileName}_res${modelResolution}_pad${paddingFactor}_${timestamp}.stl`;
      
      a.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed completely:', error);
      setLoading(true, `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setLoading(false), 3000);
      return;
    }

    // Add delay before removing loading state
    await new Promise(resolve => setTimeout(resolve, 300));
    setLoading(false);
  }, [localMesh, state.file, modelConfig, setLoading, createSingleMeshForExport]);

  return {
    localMesh,
    updateModel,
    downloadModel
  };
}; 