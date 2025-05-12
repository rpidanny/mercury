import React, { useState, useRef, useCallback } from 'react';
import { ShapeType } from '../../lib/types';
import { useAppContext } from '../../context/AppContext';
import { useModelBuilder } from '../../hooks/useModelBuilder';
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

export default function PreviewPage() {
  const { state, updateModelConfig, resetTerrain } = useAppContext();
  const { ui, modelConfig } = state;
  const { loading } = ui;
  const { shape, widthMM, altMult, rotationAngle } = modelConfig;
  
  // Local UI state
  const [activeControl, setActiveControl] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [isAltitudeChanging, setIsAltitudeChanging] = useState<boolean>(false);
  const [isWidthChanging, setIsWidthChanging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use the custom hook for model building and rendering
  const { localMesh, updateModel, downloadModel } = useModelBuilder();

  // Toggle active control panel
  const toggleControl = useCallback((controlName: string) => {
    setActiveControl(prev => prev === controlName ? null : controlName);
  }, []);

  // Handle rotation changes
  const handleRotationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateModelConfig({ rotationAngle: parseInt(e.target.value, 10) });
  }, [updateModelConfig]);
  
  const handleRotationStart = useCallback(() => {
    setIsRotating(true);
  }, []);
  
  const handleRotationEnd = useCallback(() => {
    setIsRotating(false);
    updateModel();
  }, [updateModel]);

  // Handle altitude multiplier changes
  const handleAltitudeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateModelConfig({ altMult: parseFloat(e.target.value) });
  }, [updateModelConfig]);
  
  const handleAltitudeStart = useCallback(() => {
    setIsAltitudeChanging(true);
  }, []);
  
  const handleAltitudeEnd = useCallback(() => {
    setIsAltitudeChanging(false);
    updateModel();
  }, [updateModel]);

  // Handle width changes with debounce
  const handleWidthChange = useCallback((newValue: number) => {
    updateModelConfig({ widthMM: newValue });
    setIsWidthChanging(true);
    
    // Debounce model updates
    if (window.widthChangeTimeout) {
      clearTimeout(window.widthChangeTimeout);
    }
    
    window.widthChangeTimeout = setTimeout(() => {
      setIsWidthChanging(false);
      updateModel();
    }, 300);
  }, [updateModelConfig, updateModel]);

  // Handle shape change
  const handleShapeChange = useCallback((newShape: ShapeType) => {
    // Only process if the shape actually changed
    if (newShape !== shape) {
      updateModelConfig({ shape: newShape });
      updateModel();
    }
    
    // Close the shape control after selection
    setTimeout(() => {
      setActiveControl(null);
    }, 300);
  }, [shape, updateModelConfig, updateModel]);

  const isShapeActive = useCallback((currentShape: ShapeType) => 
    shape === currentShape ? 'active' : '', 
  [shape]);

  return (
    <>
      <div id="scene-container" ref={containerRef} />
      
      <div className="home-button-container">
        <button 
          onClick={resetTerrain}
          className="home-button"
          aria-label="Back to home"
        >
          <HomeIcon />
        </button>
        <span className="tooltip">Back to home</span>
      </div>
      
      <div className="action-button-container">
        <button
          onClick={downloadModel}
          className="action-button"
          title="Download STL model"
          disabled={loading || !localMesh}
        >
          <DownloadIcon />
        </button>
        <span className="tooltip">Download 3D model</span>
      </div>
      
      <div className="toolbar">
        {/* Width control */}
        <div className="toolbar-control-wrapper">
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
          <span className="tooltip">Adjust model size</span>
        </div>
        
        {/* Shape selector control */}
        <div className="toolbar-control-wrapper">
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
          <span className="tooltip">Change model shape</span>
        </div>
        
        {/* Altitude multiplier control */}
        <div className="toolbar-control-wrapper">
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
          <span className="tooltip">Adjust terrain height</span>
        </div>
        
        {/* Rotation control */}
        <div className="toolbar-control-wrapper">
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
          <span className="tooltip">Rotate terrain model</span>
        </div>
      </div>
    </>
  );
}
