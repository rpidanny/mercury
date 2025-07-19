import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Object3D, BufferGeometry, Mesh, Matrix4 } from 'three';
import Renderer from '../lib/Renderer';
import ModelBuilder from '../lib/ModelBuilder';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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

  // Create a properly manifold mesh for 3D printing by rebuilding geometry connections
  const createSingleMeshForExport = useCallback((group: Object3D): BufferGeometry => {
    const allVertices: number[] = [];
    const allIndices: number[] = [];
    let vertexOffset = 0;
    
    // Step 1: Collect and prepare all geometries with consistent orientation
    const processedGeometries: { positions: Float32Array; isBackSide: boolean }[] = [];
    
    group.traverse((child) => {
      if (child instanceof Mesh && child.geometry) {
        const geometry = child.geometry.clone();
        
        // Apply world matrix transformations
        const worldMatrix = new Matrix4();
        child.updateWorldMatrix(true, false);
        worldMatrix.copy(child.matrixWorld);
        geometry.applyMatrix4(worldMatrix);
        
        // Convert to non-indexed geometry
        const nonIndexedGeo = geometry.index ? geometry.toNonIndexed() : geometry;
        
        // Check material orientation
        const material = (child as Mesh).material as THREE.MeshStandardMaterial;
        const isBackSide = material && material.side === THREE.BackSide;
        
        if (nonIndexedGeo.attributes.position) {
          processedGeometries.push({
            positions: nonIndexedGeo.attributes.position.array as Float32Array,
            isBackSide
          });
        }
      }
    });
    
    // Step 2: Process each geometry with consistent face orientation
    for (const { positions, isBackSide } of processedGeometries) {
      const numVertices = positions.length / 3;
      
      // Add vertices with consistent winding
      for (let i = 0; i < positions.length; i += 9) {
        if (isBackSide) {
          // Flip triangle winding for BackSide materials: v0, v2, v1
          // v0
          allVertices.push(positions[i], positions[i + 1], positions[i + 2]);
          // v2 (was v1)
          allVertices.push(positions[i + 6], positions[i + 7], positions[i + 8]);
          // v1 (was v2)  
          allVertices.push(positions[i + 3], positions[i + 4], positions[i + 5]);
        } else {
          // Keep original winding for FrontSide materials: v0, v1, v2
          allVertices.push(
            positions[i], positions[i + 1], positions[i + 2],     // v0
            positions[i + 3], positions[i + 4], positions[i + 5], // v1
            positions[i + 6], positions[i + 7], positions[i + 8]  // v2
          );
        }
      }
      
      // Add indices for this geometry
      for (let i = 0; i < numVertices; i++) {
        allIndices.push(vertexOffset + i);
      }
      
      vertexOffset += numVertices;
    }
    
    if (allVertices.length === 0) {
      throw new Error('No valid geometries found to export');
    }
    
    // Step 3: Create final geometry with merged vertices to eliminate duplicates
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(allVertices, 3));
    geometry.setIndex(allIndices);
    
    // Step 4: Merge duplicate vertices to create manifold edges
    const mergedGeometry = mergeVertices(geometry, 0.0001); // Small tolerance for floating point precision
    
    // Step 5: Final validation and normal computation
    mergedGeometry.computeVertexNormals();
    
    // Step 6: Additional manifold validation - ensure no degenerate triangles
    const finalPositions = mergedGeometry.attributes.position.array as Float32Array;
    const finalIndices = mergedGeometry.index?.array;
    
    if (!finalIndices) {
      throw new Error('Failed to create indexed geometry');
    }
    
    // Remove degenerate triangles (triangles with zero area)
    const validIndices: number[] = [];
    const EPSILON = 1e-10;
    
    for (let i = 0; i < finalIndices.length; i += 3) {
      const i1 = finalIndices[i] * 3;
      const i2 = finalIndices[i + 1] * 3;
      const i3 = finalIndices[i + 2] * 3;
      
      // Get triangle vertices
      const v1 = new THREE.Vector3(finalPositions[i1], finalPositions[i1 + 1], finalPositions[i1 + 2]);
      const v2 = new THREE.Vector3(finalPositions[i2], finalPositions[i2 + 1], finalPositions[i2 + 2]);
      const v3 = new THREE.Vector3(finalPositions[i3], finalPositions[i3 + 1], finalPositions[i3 + 2]);
      
      // Calculate triangle area using cross product
      const edge1 = v2.clone().sub(v1);
      const edge2 = v3.clone().sub(v1);
      const cross = edge1.clone().cross(edge2);
      const area = cross.length() * 0.5;
      
      // Only include triangles with sufficient area
      if (area > EPSILON) {
        validIndices.push(finalIndices[i], finalIndices[i + 1], finalIndices[i + 2]);
      }
    }
    
    // Create final clean geometry
    const cleanGeometry = new THREE.BufferGeometry();
    cleanGeometry.setAttribute('position', mergedGeometry.attributes.position);
    cleanGeometry.setIndex(validIndices);
    cleanGeometry.computeVertexNormals();
    
    console.log(`Export: Created manifold mesh with ${validIndices.length / 3} triangles`);
    return cleanGeometry;
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