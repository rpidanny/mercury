import React, { useEffect, useRef, useState, useCallback } from 'react';
import Renderer from '../../lib/Renderer';
import { ShapeType } from '../../lib/types';
import type { Object3D } from 'three';
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import type { TerrainData } from '../../lib/TerrainGenerator';
import ModelBuilder from '../../lib/ModelBuilder';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { 
  WidthIcon, 
  ShapeIcon, 
  AltitudeIcon, 
  RotationIcon, 
  HomeIcon, 
  DownloadIcon,
  HexagonIcon,
  SquareIcon,
  CircleIcon
} from '../../components/Icons';
import ToolbarControl from '../../components/ToolbarControl';
import './PreviewPage.css';

// Declare global Window property
declare global {
  interface Window {
    widthChangeTimeout?: ReturnType<typeof setTimeout>;
  }
}

interface PreviewPageProps {
  terrainData: TerrainData;
  font: Font | null;
  embossText: string;
  initialShape: ShapeType;
  initialWidthMM: number;
  initialAltMult: number;
  initialRotationAngle: number;
  loading: boolean;
  setLoading: (isLoading: boolean, message?: string) => void;
  onReset: () => void;
}

// Custom hook for model building and rendering
function useModelBuilder(
  terrainData: TerrainData, 
  widthMM: number, 
  altMult: number, 
  shape: ShapeType, 
  embossText: string, 
  font: Font | null, 
  rotationAngle: number,
  setLoading: (isLoading: boolean, message?: string) => void
) {
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
              rotationAngle
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
  }, [terrainData, pendingChanges, widthMM, altMult, shape, embossText, font, rotationAngle, setLoading, isRendererInitialized]);
  
  // Update renderer when mesh changes after initial render
  useEffect(() => {
    if (rendererRef.current && localMesh && initialRenderComplete.current) {
      rendererRef.current.updateMeshPreserveCamera(localMesh);
    }
  }, [localMesh]);

  const setModelChange = useCallback(() => {
    setPendingChanges(true);
    setLoading(true, 'Updating model...');
  }, [setLoading]);

  // Handle download functionality
  const handleDownload = useCallback(() => {
    if (!localMesh) return;
    
    const exporter = new STLExporter();
    const stlString = exporter.parse(localMesh);
    const blob = new Blob([stlString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.stl';
    a.click();
    URL.revokeObjectURL(url);
  }, [localMesh]);

  return {
    localMesh,
    setModelChange,
    handleDownload
  };
}

// Main PreviewPage Component
export default function PreviewPage({
  terrainData,
  font,
  embossText,
  initialShape,
  initialWidthMM,
  initialAltMult,
  initialRotationAngle,
  loading,
  setLoading,
  onReset,
}: PreviewPageProps) {
  // Local state for all toolbox values
  const [shape, setShape] = useState<ShapeType>(initialShape);
  const [widthMM, setWidthMM] = useState<number>(initialWidthMM);
  const [altMult, setAltMult] = useState<number>(initialAltMult);
  const [rotationAngle, setRotationAngle] = useState<number>(initialRotationAngle);
  
  // UI state
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeControl, setActiveControl] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [isAltitudeChanging, setIsAltitudeChanging] = useState<boolean>(false);
  const [isWidthChanging, setIsWidthChanging] = useState<boolean>(false);
  
  // Use the custom hook for model building and rendering
  const { localMesh, setModelChange, handleDownload } = useModelBuilder(
    terrainData,
    widthMM,
    altMult,
    shape,
    embossText,
    font,
    rotationAngle,
    setLoading
  );

  // Toggle active control panel
  const toggleControl = useCallback((controlName: string) => {
    setActiveControl(prev => prev === controlName ? null : controlName);
  }, []);

  // Handle rotation changes
  const handleRotationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRotationAngle(parseInt(e.target.value, 10));
  }, []);
  
  const handleRotationStart = useCallback(() => {
    setIsRotating(true);
  }, []);
  
  const handleRotationEnd = useCallback(() => {
    setIsRotating(false);
    setModelChange();
  }, [setModelChange]);

  // Handle altitude multiplier changes
  const handleAltitudeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAltMult(parseFloat(e.target.value));
  }, []);
  
  const handleAltitudeStart = useCallback(() => {
    setIsAltitudeChanging(true);
  }, []);
  
  const handleAltitudeEnd = useCallback(() => {
    setIsAltitudeChanging(false);
    setModelChange();
  }, [setModelChange]);

  // Handle width changes with debounce
  const handleWidthChange = useCallback((newValue: number) => {
    setWidthMM(newValue);  
    setIsWidthChanging(true);
    
    // Debounce model updates
    if (window.widthChangeTimeout) {
      clearTimeout(window.widthChangeTimeout);
    }
    
    window.widthChangeTimeout = setTimeout(() => {
      setIsWidthChanging(false);
      setModelChange();
    }, 300);
  }, [setModelChange]);

  // Handle shape change
  const handleShapeChange = useCallback((newShape: ShapeType) => {
    // Only process if the shape actually changed
    if (newShape !== shape) {
      setShape(newShape);
      setModelChange();
    }
    
    // Close the shape control after selection
    setTimeout(() => {
      setActiveControl(null);
    }, 300);
  }, [shape, setModelChange]);

  const isShapeActive = useCallback((currentShape: ShapeType) => 
    shape === currentShape ? 'active' : '', 
  [shape]);

  return (
    <>
      <div id="scene-container" ref={containerRef} />
      
      <div className="home-button-container">
        <button 
          onClick={onReset}
          className="home-button"
          aria-label="Back to home"
        >
          <HomeIcon />
        </button>
        <span className="tooltip">Back to home</span>
      </div>
      
      <div className="action-button-container">
        <button
          onClick={handleDownload}
          className="action-button"
          title="Download STL model"
          disabled={loading || !localMesh}
        >
          <DownloadIcon />
        </button>
      </div>
      
      <div className="toolbar">
        {/* Width control */}
        <ToolbarControl
          name="width"
          activeControl={activeControl}
          toggleControl={toggleControl}
          isChanging={isWidthChanging}
          title="Adjust model size"
          disabled={loading}
          icon={<WidthIcon />}
        >
          <div className="width-control-container">
            <label className="width-label">Model Size</label>
            
            <div className="size-presets">
              <button 
                className={`size-preset-button ${widthMM <= 100 ? 'active' : ''}`}
                onClick={() => handleWidthChange(100)}
                disabled={loading || widthMM === 100}
                title="Small (100mm)"
                type="button"
              >
                <div className="size-icon small"></div>
                <span>Small</span>
              </button>
              
              <button 
                className={`size-preset-button ${widthMM > 100 && widthMM <= 250 ? 'active' : ''}`}
                onClick={() => handleWidthChange(250)}
                disabled={loading || widthMM === 250}
                title="Medium (250mm)"
                type="button"
              >
                <div className="size-icon medium"></div>
                <span>Medium</span>
              </button>
              
              <button 
                className={`size-preset-button ${widthMM > 250 ? 'active' : ''}`}
                onClick={() => handleWidthChange(500)}
                disabled={loading || widthMM === 500}
                title="Large (500mm)"
                type="button"
              >
                <div className="size-icon large"></div>
                <span>Large</span>
              </button>
            </div>
            
            <div className="width-slider-wrapper">
              <span className="width-range-label">Fine adjustment:</span>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={widthMM}
                onChange={(e) => handleWidthChange(parseInt(e.target.value, 10))}
                className="width-slider"
                aria-label="Adjust model width"
                disabled={loading}
              />
              <span className="width-value">{widthMM}mm</span>
            </div>
            
            <div className="size-description">
              Width of the final 3D print.
            </div>
          </div>
        </ToolbarControl>
        
        {/* Shape selector control */}
        <ToolbarControl
          name="shape"
          activeControl={activeControl}
          toggleControl={toggleControl}
          title="Change shape"
          disabled={loading}
          icon={<ShapeIcon />}
        >
          <button 
            className={`shape-button ${isShapeActive('hexagon')}`} 
            onClick={() => handleShapeChange('hexagon')}
            title="Hexagon shape"
            disabled={loading}
          >
            <HexagonIcon />
          </button>
          <button 
            className={`shape-button ${isShapeActive('square')}`} 
            onClick={() => handleShapeChange('square')}
            title="Square shape"
            disabled={loading}
          >
            <SquareIcon />
          </button>
          <button 
            className={`shape-button ${isShapeActive('circle')}`} 
            onClick={() => handleShapeChange('circle')}
            title="Circle shape"
            disabled={loading}
          >
            <CircleIcon />
          </button>
        </ToolbarControl>
        
        {/* Altitude multiplier control */}
        <ToolbarControl
          name="altitude"
          activeControl={activeControl}
          toggleControl={toggleControl}
          isChanging={isAltitudeChanging}
          title="Adjust altitude"
          disabled={loading}
          icon={<AltitudeIcon />}
        >
          <div className="slider-container altitude-slider-container">
            <label className="altitude-label">Altitude Multiplier</label>
            <div className="altitude-slider-wrapper">
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.1"
                value={altMult}
                onChange={handleAltitudeChange}
                onMouseDown={handleAltitudeStart}
                onMouseUp={handleAltitudeEnd}
                onTouchStart={handleAltitudeStart}
                onTouchEnd={handleAltitudeEnd}
                className="altitude-slider"
                aria-label="Adjust altitude multiplier"
                disabled={loading}
              />
              <span className="altitude-value">{altMult.toFixed(1)}×</span>
            </div>
          </div>
        </ToolbarControl>
        
        {/* Rotation control */}
        <ToolbarControl
          name="rotation"
          activeControl={activeControl}
          toggleControl={toggleControl}
          isChanging={isRotating}
          title="Rotate terrain"
          disabled={loading}
          icon={<RotationIcon />}
        >
          <div className="slider-container">
            <input
              type="range"
              min="-180"
              max="180"
              value={rotationAngle}
              onChange={handleRotationChange}
              onMouseDown={handleRotationStart}
              onMouseUp={handleRotationEnd}
              onTouchStart={handleRotationStart}
              onTouchEnd={handleRotationEnd}
              className="rotation-slider"
              aria-label="Rotate terrain"
              disabled={loading}
            />
            <span className="rotation-value">{rotationAngle}°</span>
          </div>
        </ToolbarControl>
      </div>
    </>
  );
}
