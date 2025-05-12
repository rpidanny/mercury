import { useEffect, useRef, useState } from 'react';
import Renderer from '../../lib/Renderer';
import { ShapeType } from '../../lib/types';
import type { Object3D } from 'three';
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import type { TerrainData } from '../../lib/TerrainGenerator';
import ModelBuilder from '../../lib/ModelBuilder';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
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
  setLoading: (loading: boolean) => void;
  setStatus: (status: string) => void;
  loadingStatus?: string;
  onReset: () => void;
}

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
  setStatus,
  loadingStatus,
  onReset,
}: PreviewPageProps) {
  // Local state for all toolbox values
  const [shape, setShape] = useState<ShapeType>(initialShape);
  const [widthMM, setWidthMM] = useState<number>(initialWidthMM);
  const [altMult, setAltMult] = useState<number>(initialAltMult);
  const [rotationAngle, setRotationAngle] = useState<number>(initialRotationAngle);
  const [localMesh, setLocalMesh] = useState<Object3D | null>(null);

  // UI state
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [isRendererInitialized, setIsRendererInitialized] = useState<boolean>(false);
  const [activeControl, setActiveControl] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [isAltitudeChanging, setIsAltitudeChanging] = useState<boolean>(false);
  const [isWidthChanging, setIsWidthChanging] = useState<boolean>(false);
  const [pendingChanges, setPendingChanges] = useState<boolean>(false);
  const initialRenderComplete = useRef<boolean>(false);
  const isBuildingModel = useRef<boolean>(false);
  
  // Initialize renderer on mount
  useEffect(() => {
    document.body.classList.add('model-mode');
    
    if (containerRef.current && !rendererRef.current) {
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
    if (!terrainData || !isRendererInitialized) return;
    if (isBuildingModel.current) return; // Prevent concurrent builds
    
    const buildModel = async () => {
      // Set loading state immediately
      setLoading(true);
      setStatus('Building 3D model...');
      isBuildingModel.current = true;
      
      try {
        // Ensure the loading state has time to be applied to the UI
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Wrap model building in a Promise to make it asynchronous
        const result = await new Promise<{ mesh: Object3D }>((resolve) => {
          // Use requestAnimationFrame to ensure we're not blocking the UI thread
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
        
        // Directly render the mesh for the first time to ensure it's displayed
        if (!initialRenderComplete.current && rendererRef.current) {
          rendererRef.current.renderMesh(result.mesh);
          initialRenderComplete.current = true;
        }
        
        setStatus('');
      } catch (err: unknown) {
        setStatus(err instanceof Error ? err.message : String(err));
      } finally {
        // Give the UI a moment to show the completed state before hiding loading
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
  }, [terrainData, pendingChanges, widthMM, altMult, shape, embossText, font, rotationAngle, setStatus, setLoading, isRendererInitialized]);
  
  // Update renderer when mesh changes after initial render
  useEffect(() => {
    if (rendererRef.current && localMesh && initialRenderComplete.current) {
      rendererRef.current.updateMeshPreserveCamera(localMesh);
    }
  }, [localMesh]);
  
  // Handle download functionality
  const handleDownload = () => {
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
  };

  // Handle rotation changes
  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setRotationAngle(newValue);
  };
  
  const handleRotationStart = () => {
    setIsRotating(true);
  };
  
  const handleRotationEnd = () => {
    setIsRotating(false);
    setPendingChanges(true);
  };

  // Handle altitude multiplier changes
  const handleAltitudeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setAltMult(newValue);
  };
  
  const handleAltitudeStart = () => {
    setIsAltitudeChanging(true);
  };
  
  const handleAltitudeEnd = () => {
    setIsAltitudeChanging(false);
    setPendingChanges(true);
  };

  // Handle width changes
  const handleWidthChange = (newValue: number) => {
    setWidthMM(newValue);  

    // Start the changing state if not already
    if (!isWidthChanging) {
      setIsWidthChanging(true);
    }
    
    // Clear any existing timeout to avoid multiple regenerations
    if (window.widthChangeTimeout) {
      clearTimeout(window.widthChangeTimeout);
    }
    
    // Set a new timeout for regeneration
    window.widthChangeTimeout = setTimeout(() => {
      setIsWidthChanging(false);
      setPendingChanges(true);
    }, 300);
  };
  
  const handleWidthStart = () => {
    setIsWidthChanging(true);
  };

  // Toggle active control panel
  const toggleControl = (controlName: string) => {
    if (activeControl === controlName) {
      setActiveControl(null);
    } else {
      setActiveControl(controlName);
    }
  };

  // Handle shape change
  const handleShapeChange = (newShape: ShapeType) => {
    // Only process if the shape actually changed
    if (newShape !== shape) {
      setShape(newShape);
      setPendingChanges(true);
    }
    
    // Close the shape control after selection
    setTimeout(() => {
      setActiveControl(null);
    }, 300);
  };

  const isShapeActive = (currentShape: ShapeType) => {
    return shape === currentShape ? 'active' : '';
  };

  return (
    <>
      <div id="scene-container" ref={containerRef} />
      
      <div className="home-button-container">
        <button 
          onClick={onReset}
          className="home-button"
          aria-label="Back to home"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </button>
        <span className="tooltip">Back to home</span>
      </div>
      
      {/* Action button for download */}
      <div className="action-button-container">
        <button
          onClick={handleDownload}
          className="action-button"
          title="Download STL model"
          disabled={loading || !localMesh}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      </div>
      
      {/* Update indicator */}
      {loading && (
        <div className="update-indicator">
          <div className="spinner"></div>
          <span>{loadingStatus || "Updating..."}</span>
        </div>
      )}
      
      {/* Toolbar */}
      <div className="toolbar">
        {/* Width control */}
        <div className={`toolbar-control ${activeControl === 'width' ? 'active' : ''}`}>
          <button
            className={`toolbar-button ${isWidthChanging ? 'is-scaling' : ''}`}
            onClick={() => toggleControl('width')}
            title="Adjust model size"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18"></rect>
              <path d="M3 9h18"></path>
              <path d="M3 15h18"></path>
              <path d="M9 3v18"></path>
              <path d="M15 3v18"></path>
            </svg>
          </button>
          
          {activeControl === 'width' && (
            <div className="toolbar-panel width-panel">
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
                    onMouseDown={handleWidthStart}
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
            </div>
          )}
        </div>
        
        {/* Shape selector control */}
        <div className={`toolbar-control ${activeControl === 'shape' ? 'active' : ''}`}>
          <button
            className="toolbar-button"
            onClick={() => toggleControl('shape')}
            title="Change shape"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
              <line x1="8" y1="2" x2="8" y2="18"></line>
              <line x1="16" y1="6" x2="16" y2="22"></line>
            </svg>
          </button>
          
          {activeControl === 'shape' && (
            <div className="toolbar-panel shape-panel">
              <button 
                className={`shape-button ${isShapeActive('hexagon')}`} 
                onClick={() => handleShapeChange('hexagon')}
                title="Hexagon shape"
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5Z" />
                </svg>
              </button>
              <button 
                className={`shape-button ${isShapeActive('square')}`} 
                onClick={() => handleShapeChange('square')}
                title="Square shape"
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <rect x="3" y="3" width="18" height="18" rx="0" />
                </svg>
              </button>
              <button 
                className={`shape-button ${isShapeActive('circle')}`} 
                onClick={() => handleShapeChange('circle')}
                title="Circle shape"
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Altitude multiplier control */}
        <div className={`toolbar-control ${activeControl === 'altitude' ? 'active' : ''}`}>
          <button
            className={`toolbar-button ${isAltitudeChanging ? 'is-elevating' : ''}`}
            onClick={() => toggleControl('altitude')}
            title="Adjust altitude"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 22l10-10 10 10M16 6l-4-4-4 4M12 2v8"></path>
            </svg>
          </button>
          
          {activeControl === 'altitude' && (
            <div className="toolbar-panel altitude-panel">
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
            </div>
          )}
        </div>
        
        {/* Rotation control */}
        <div className={`toolbar-control ${activeControl === 'rotation' ? 'active' : ''}`}>
          <button
            className={`toolbar-button ${isRotating ? 'is-rotating' : ''}`}
            onClick={() => toggleControl('rotation')}
            title="Rotate terrain"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>
          
          {activeControl === 'rotation' && (
            <div className="toolbar-panel rotation-panel">
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
            </div>
          )}
        </div>
      </div>
    </>
  );
} 