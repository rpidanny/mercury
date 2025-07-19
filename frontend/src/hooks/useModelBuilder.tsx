import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Object3D, BufferGeometry, Mesh, Matrix4 } from 'three';
import Renderer from '../lib/Renderer';
import ModelBuilder from '../lib/ModelBuilder';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const useModelBuilder = () => {
  const { state, setLoading } = useAppContext();
  const { resources, modelConfig } = state;
  const { terrainData, font } = resources;
  const { widthMM, altMult, shape, embossText, rotationAngle, lowPolyMode, textPlatformHeightOverride } = modelConfig;
  
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
  }, [terrainData, pendingChanges, widthMM, altMult, shape, embossText, font, rotationAngle, lowPolyMode, textPlatformHeightOverride, setLoading, isRendererInitialized, localMesh]);
  
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
        
        // Convert indexed geometry to non-indexed to ensure compatibility
        let cleanGeometry: BufferGeometry;
        
        if (geometry.index) {
          cleanGeometry = geometry.toNonIndexed();
        } else {
          cleanGeometry = geometry;
        }
        
        // Handle face orientation for manifold mesh
        // Check if this mesh uses BackSide material (terrain, base, wall)
        const material = (child as Mesh).material as THREE.MeshStandardMaterial;
        const needsFlip = material && material.side === THREE.BackSide;
        
        // Create export geometry with consistent face orientation
        const exportGeometry = new THREE.BufferGeometry();
        
        if (cleanGeometry.attributes.position) {
          const positionAttr = cleanGeometry.attributes.position.clone();
          
          // Flip faces for BackSide materials to ensure consistent outward normals
          if (needsFlip) {
            const positions = positionAttr.array as Float32Array;
            const newPositions = new Float32Array(positions.length);
            
            // Reverse triangle winding order to flip faces
            for (let i = 0; i < positions.length; i += 9) {
              // Original triangle: v0, v1, v2
              // Flipped triangle: v0, v2, v1
              
              // v0 (unchanged)
              newPositions[i] = positions[i];
              newPositions[i + 1] = positions[i + 1];
              newPositions[i + 2] = positions[i + 2];
              
              // v2 (was v1)
              newPositions[i + 3] = positions[i + 6];
              newPositions[i + 4] = positions[i + 7];
              newPositions[i + 5] = positions[i + 8];
              
              // v1 (was v2)
              newPositions[i + 6] = positions[i + 3];
              newPositions[i + 7] = positions[i + 4];
              newPositions[i + 8] = positions[i + 5];
            }
            
            exportGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
          } else {
            exportGeometry.setAttribute('position', positionAttr);
          }
        } else {
          console.warn('Geometry without position attribute found, skipping');
          return;
        }
        
        // Validate the geometry has valid triangles
        const positionCount = exportGeometry.attributes.position.count;
        if (positionCount >= 3 && positionCount % 3 === 0) {
          geometries.push(exportGeometry);
        } else {
          console.warn(`Invalid geometry with ${positionCount} vertices, skipping`);
        }
      }
    });
    
    if (geometries.length === 0) {
      throw new Error('No valid geometries found to export');
    }
    
    // Merge all geometries with consistent face orientations
    const mergedGeometry = mergeGeometries(geometries, false);
    
    if (!mergedGeometry) {
      throw new Error('Failed to merge geometries');
    }
    
    // Ensure consistent winding and compute normals for manifold mesh
    mergedGeometry.computeVertexNormals();
    
    // Additional manifold validation - remove duplicate vertices that can cause non-manifold edges
    const cleanedGeometry = mergeVertices(mergedGeometry);
    
    return cleanedGeometry;
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