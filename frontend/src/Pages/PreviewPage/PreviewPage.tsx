import { useEffect, useRef, useState } from 'react';
import Renderer from '../../lib/Renderer';
import { ShapeType } from '../../lib/types';
import { CompactFormControls } from '../../components/FormControls';
import type { Object3D } from 'three';
import './PreviewPage.css';

interface PreviewPageProps {
  mesh: Object3D;
  onDownload: () => void;
  shape: ShapeType;
  onShapeChange: (shape: ShapeType) => void;
  widthMM: number;
  onWidthChange: (v: number) => void;
  altMult: number;
  onAltMultChange: (v: number) => void;
  onRegenerate: () => void;
  loading: boolean;
  onReset: () => void;
  rotationAngle: number;
  onRotationChange: (angle: number) => void;
}

export default function PreviewPage({
  mesh,
  onDownload,
  shape,
  onShapeChange,
  widthMM,
  onWidthChange,
  altMult,
  onAltMultChange,
  onRegenerate,
  loading,
  onReset,
  rotationAngle,
  onRotationChange,
}: PreviewPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const isInitialRender = useRef<boolean>(true);
  const [activeControl, setActiveControl] = useState<string | null>(null);
  const [pendingShapeChange, setPendingShapeChange] = useState<boolean>(false);

  useEffect(() => {
    document.body.classList.add('model-mode');
    
    // Only create a new renderer on the first render
    if (containerRef.current && isInitialRender.current) {
      const renderer = new Renderer('#scene-container');
      rendererRef.current = renderer;
      renderer.renderMesh(mesh);
      isInitialRender.current = false;
    } 
    // On subsequent renders, update the mesh while preserving camera position
    else if (rendererRef.current) {
      rendererRef.current.updateMeshPreserveCamera(mesh);
    }
    
    return () => {
      document.body.classList.remove('model-mode');
    };
  }, [mesh]);

  // Trigger regeneration when shape changes
  useEffect(() => {
    if (pendingShapeChange) {
      onRegenerate();
      setPendingShapeChange(false);
    }
  }, [pendingShapeChange, onRegenerate, shape]);

  // Handle rotation changes
  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    onRotationChange(newValue);
  };
  
  const handleRotationStart = () => {
    setIsRotating(true);
  };
  
  const handleRotationEnd = () => {
    setIsRotating(false);
    onRegenerate(); // Regenerate the model with the new rotation angle
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
      onShapeChange(newShape);
      setPendingShapeChange(true);
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
      
      {/* Toolbar */}
      <div className="toolbar">
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
      </div>
      
      <div className="absolute bottom-4 left-4 z-10 flex flex-col space-y-2 bg-white bg-opacity-80 p-3 rounded-lg shadow-lg">
        <CompactFormControls
          widthMM={widthMM}
          onWidthChange={onWidthChange}
          altMult={altMult}
          onAltMultChange={onAltMultChange}
        />
        
        <div className="flex space-x-2">
          <button
            onClick={onRegenerate}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 rounded disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update'}
          </button>
          <button
            onClick={onDownload}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-1 rounded"
          >
            Download
          </button>
        </div>
      </div>
    </>
  );
} 