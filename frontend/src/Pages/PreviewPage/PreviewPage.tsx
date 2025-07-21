import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ShapeType } from '../../lib/types';
import { useAppContext } from '../../context/AppContext';
import { useModelBuilder } from '../../hooks/useModelBuilder';
import { FONTS } from '../../lib/fonts';
import { 
  WidthIcon, 
  ShapeIcon, 
  AltitudeIcon, 
  RotationIcon, 
  HomeIcon, 
  DownloadIcon,
  HexagonIcon,
  SquareIcon,
  CircleIcon,
  LowPolyIcon,
  TextHeightIcon,
  FontIcon
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
  const { state, updateModelConfig, resetTerrain, setLowPolyMode } = useAppContext();
  const { ui, modelConfig } = state;
  const { loading } = ui;
  const { shape, widthMM, altMult, rotationAngle, lowPolyMode, embossText, textPlatformHeightOverride, selectedFontKey, fontBold, fontItalic } = modelConfig;
  
  // Local UI state
  const [activeControl, setActiveControl] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [isAltitudeChanging, setIsAltitudeChanging] = useState<boolean>(false);
  const [isWidthChanging, setIsWidthChanging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  // Use the custom hook for model building and rendering
  const { localMesh, updateModel, downloadModel } = useModelBuilder();

  // Close toolbar panels when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeControl && toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setActiveControl(null);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeControl) {
        setActiveControl(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [activeControl]);

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

  // Handle rotation preset changes
  const handleRotationPreset = useCallback((angle: number) => {
    updateModelConfig({ rotationAngle: angle });
    updateModel();
  }, [updateModelConfig, updateModel]);

  const isRotationPresetActive = useCallback((angle: number) => {
    return rotationAngle === angle ? 'active' : '';
  }, [rotationAngle]);

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

  // Handle lowPolyMode changes
  const handleLowPolyModeChange = useCallback((enabled: boolean) => {
    setLowPolyMode(enabled);
    updateModel();
  }, [setLowPolyMode, updateModel]);

  // Handle font selection changes
  const handleFontChange = useCallback((fontKey: string) => {
    updateModelConfig({ selectedFontKey: fontKey });
    updateModel();
  }, [updateModelConfig, updateModel]);

  const isFontActive = useCallback((fontKey: string) => 
    selectedFontKey === fontKey ? 'active' : '', 
  [selectedFontKey]);

  // Handle font style changes
  const handleFontBoldChange = useCallback((bold: boolean) => {
    updateModelConfig({ fontBold: bold });
    updateModel();
  }, [updateModelConfig, updateModel]);

  const handleFontItalicChange = useCallback((italic: boolean) => {
    updateModelConfig({ fontItalic: italic });
    updateModel();
  }, [updateModelConfig, updateModel]);

  // Handle text platform height changes
  const handleTextHeightChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateModelConfig({ textPlatformHeightOverride: parseFloat(e.target.value) });
  }, [updateModelConfig]);
  
  const handleTextHeightEnd = useCallback(() => {
    updateModel();
  }, [updateModel]);

  // Reset text platform height to default
  const resetTextHeight = useCallback(() => {
    updateModelConfig({ textPlatformHeightOverride: undefined });
    updateModel();
  }, [updateModelConfig, updateModel]);

  // Handle text height preset changes
  const handleTextHeightPreset = useCallback((height: number | undefined) => {
    updateModelConfig({ textPlatformHeightOverride: height });
    updateModel();
  }, [updateModelConfig, updateModel]);

  const isTextHeightPresetActive = useCallback((height: number | undefined) => {
    if (height === undefined && textPlatformHeightOverride === undefined) return 'active';
    return textPlatformHeightOverride === height ? 'active' : '';
  }, [textPlatformHeightOverride]);

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
      
      <div className="toolbar" ref={toolbarRef}>
        {/* Width control */}
        <div className="toolbar-control-wrapper">
          <ToolbarControl
            name="width"
            activeControl={activeControl}
            toggleControl={toggleControl}
            isChanging={isWidthChanging}
            title="Resize your 3D model"
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
                  title="Small model (100mm)"
                  type="button"
                >
                  <div className="size-icon small"></div>
                  <span>Small</span>
                </button>
                
                <button 
                  className={`size-preset-button ${widthMM > 100 && widthMM <= 250 ? 'active' : ''}`}
                  onClick={() => handleWidthChange(250)}
                  disabled={loading || widthMM === 250}
                  title="Medium model (250mm)"
                  type="button"
                >
                  <div className="size-icon medium"></div>
                  <span>Medium</span>
                </button>
                
                <button 
                  className={`size-preset-button ${widthMM > 250 ? 'active' : ''}`}
                  onClick={() => handleWidthChange(500)}
                  disabled={loading || widthMM === 500}
                  title="Large model (500mm)"
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
          <span className="tooltip">Resize your 3D model</span>
        </div>
        
        {/* Shape selector control */}
        <div className="toolbar-control-wrapper">
          <ToolbarControl
            name="shape"
            activeControl={activeControl}
            toggleControl={toggleControl}
            title="Choose base shape"
            disabled={loading}
            icon={<ShapeIcon />}
          >
            <button 
              className={`shape-button ${isShapeActive('hexagon')}`} 
              onClick={() => handleShapeChange('hexagon')}
              title="Hexagon base"
              disabled={loading}
            >
              <HexagonIcon />
            </button>
            <button 
              className={`shape-button ${isShapeActive('square')}`} 
              onClick={() => handleShapeChange('square')}
              title="Square base"
              disabled={loading}
            >
              <SquareIcon />
            </button>
            <button 
              className={`shape-button ${isShapeActive('circle')}`} 
              onClick={() => handleShapeChange('circle')}
              title="Circle base"
              disabled={loading}
            >
              <CircleIcon />
            </button>
          </ToolbarControl>
          <span className="tooltip">Choose base shape</span>
        </div>
        
        {/* Altitude multiplier control */}
        <div className="toolbar-control-wrapper">
          <ToolbarControl
            name="altitude"
            activeControl={activeControl}
            toggleControl={toggleControl}
            isChanging={isAltitudeChanging}
            title="Scale terrain elevation"
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
          <span className="tooltip">Scale terrain elevation</span>
        </div>
        
        {/* Rotation control */}
        <div className="toolbar-control-wrapper">
          <ToolbarControl
            name="rotation"
            activeControl={activeControl}
            toggleControl={toggleControl}
            isChanging={isRotating}
            title="Rotate your model"
            disabled={loading}
            icon={<RotationIcon />}
          >
            <div className="rotation-control-container">
              <label className="rotation-label">Rotation Angle</label>
              
              <div className="rotation-presets">
                <button 
                  className={`rotation-preset-button ${isRotationPresetActive(0)}`}
                  onClick={() => handleRotationPreset(0)}
                  disabled={loading}
                  title="Original orientation (0°)"
                  type="button"
                >
                  0°
                </button>
                
                <button 
                  className={`rotation-preset-button ${isRotationPresetActive(30)}`}
                  onClick={() => handleRotationPreset(30)}
                  disabled={loading}
                  title="30° - Half hexagon side"
                  type="button"
                >
                  30°
                </button>
                
                <button 
                  className={`rotation-preset-button ${isRotationPresetActive(45)}`}
                  onClick={() => handleRotationPreset(45)}
                  disabled={loading}
                  title="45° - Square/rectangle diagonal"
                  type="button"
                >
                  45°
                </button>
                
                <button 
                  className={`rotation-preset-button ${isRotationPresetActive(60)}`}
                  onClick={() => handleRotationPreset(60)}
                  disabled={loading}
                  title="60° - Hexagon side alignment"
                  type="button"
                >
                  60°
                </button>
                
                <button 
                  className={`rotation-preset-button ${isRotationPresetActive(90)}`}
                  onClick={() => handleRotationPreset(90)}
                  disabled={loading}
                  title="90° - Quarter turn"
                  type="button"
                >
                  90°
                </button>
                
                <button 
                  className={`rotation-preset-button ${isRotationPresetActive(120)}`}
                  onClick={() => handleRotationPreset(120)}
                  disabled={loading}
                  title="120° - Hexagon vertex alignment"
                  type="button"
                >
                  120°
                </button>
              </div>
              
              <div className="rotation-slider-wrapper">
                <span className="rotation-range-label">Fine adjustment:</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={rotationAngle}
                  onChange={handleRotationChange}
                  onMouseDown={handleRotationStart}
                  onMouseUp={handleRotationEnd}
                  onTouchStart={handleRotationStart}
                  onTouchEnd={handleRotationEnd}
                  className="rotation-slider"
                  aria-label="Fine adjust rotation angle"
                  disabled={loading}
                />
                <span className="rotation-value">{rotationAngle}°</span>
              </div>
              
              <div className="rotation-description">
                Choose angles optimized for hexagons and rectangles, or fine-tune below.
              </div>
            </div>
          </ToolbarControl>
          <span className="tooltip">Rotate your model</span>
        </div>
        
        {/* LowPoly control */}
        <div className="toolbar-control-wrapper">
          <ToolbarControl
            name="lowpoly"
            activeControl={activeControl}
            toggleControl={toggleControl}
            title="Switch between detailed & low poly styles"
            disabled={loading}
            icon={<LowPolyIcon />}
          >
            <div className="lowpoly-control-container">
              <label className="lowpoly-label">Model Detail</label>
              <div className="lowpoly-toggle-wrapper">
                <div className="lowpoly-toggle-control">
                  <span className={`lowpoly-status-text ${lowPolyMode ? 'active' : ''}`}>
                    {lowPolyMode ? 'Low Poly' : 'Detailed'}
                  </span>
                  <label className="modern-toggle-switch">
                    <input 
                      type="checkbox" 
                      className="modern-toggle-input"
                      checked={lowPolyMode}
                      onChange={e => handleLowPolyModeChange(e.target.checked)}
                      disabled={loading}
                    />
                    <span className="modern-toggle-slider"></span>
                  </label>
                </div>
                <p className="lowpoly-description">
                  {lowPolyMode 
                    ? 'Clean low poly geometry with minimal triangles' 
                    : 'Rich detail with smooth curves'
                  }
                </p>
              </div>
            </div>
          </ToolbarControl>
          <span className="tooltip">Switch between detailed & low poly styles</span>
        </div>

        {/* Text Platform Height control */}
        {embossText && (
          <div className="toolbar-control-wrapper">
            <ToolbarControl
              name="textHeight"
              activeControl={activeControl}
              toggleControl={toggleControl}
              title="Override text platform height"
              disabled={loading}
              icon={<TextHeightIcon />}
            >
              <div className="text-height-control-container">
                <label className="text-height-label">Text Platform Height</label>
                                 <div className="text-height-preset-buttons">
                   <button 
                     className={`text-height-preset-button ${isTextHeightPresetActive(undefined)}`}
                     onClick={() => handleTextHeightPreset(undefined)}
                     disabled={loading}
                     title="Auto (default)"
                   >
                     Auto
                   </button>
                   <button 
                     className={`text-height-preset-button ${isTextHeightPresetActive(5)}`}
                     onClick={() => handleTextHeightPreset(5)}
                     disabled={loading}
                     title="Low (5mm)"
                   >
                     Low
                   </button>
                   <button 
                     className={`text-height-preset-button ${isTextHeightPresetActive(10)}`}
                     onClick={() => handleTextHeightPreset(10)}
                     disabled={loading}
                     title="Medium (10mm)"
                   >
                     Medium
                   </button>
                   <button 
                     className={`text-height-preset-button ${isTextHeightPresetActive(20)}`}
                     onClick={() => handleTextHeightPreset(20)}
                     disabled={loading}
                     title="High (20mm)"
                   >
                     High
                   </button>
                 </div>
                <div className="text-height-slider-wrapper">
                  <span className="text-height-range-label">Fine adjustment:</span>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={textPlatformHeightOverride || 0}
                    onChange={handleTextHeightChange}
                    onMouseUp={handleTextHeightEnd}
                    onTouchEnd={handleTextHeightEnd}
                    className="text-height-slider"
                    aria-label="Adjust text platform height"
                    disabled={loading}
                  />
                  <span className="text-height-value">
                     {textPlatformHeightOverride === undefined ? 'Auto' : `${textPlatformHeightOverride}mm`}
                   </span>
                </div>
                <div className="text-height-description">
                  {textPlatformHeightOverride === undefined 
                    ? 'Automatic height based on terrain' 
                    : `Custom height: ${textPlatformHeightOverride}mm`
                  }
                </div>
                <button 
                  className="reset-text-height-button" 
                  onClick={resetTextHeight} 
                  disabled={loading || !textPlatformHeightOverride}
                  title="Reset text platform height"
                >
                  Reset
                </button>
              </div>
            </ToolbarControl>
            <span className="tooltip">Override text platform height</span>
          </div>
        )}

        {/* Font Selection control */}
        {embossText && (
          <div className="toolbar-control-wrapper">
            <ToolbarControl
              name="font"
              activeControl={activeControl}
              toggleControl={toggleControl}
              title="Choose text font style"
              disabled={loading}
              icon={<FontIcon />}
            >
              <div className="font-control-container">
                <label className="font-label">Text Font</label>
                
                {/* Font Style Toggles */}
                <div className="font-style-toggles">
                  <button
                    className={`font-style-button ${fontBold ? 'active' : ''}`}
                    onClick={() => handleFontBoldChange(!fontBold)}
                    disabled={loading}
                    title="Toggle Bold"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    className={`font-style-button ${fontItalic ? 'active' : ''}`}
                    onClick={() => handleFontItalicChange(!fontItalic)}
                    disabled={loading}
                    title="Toggle Italic"
                  >
                    <em>I</em>
                  </button>
                </div>
                
                <div className="font-grid">
                  {Object.entries(FONTS).map(([fontKey, fontInfo]) => (
                    <button
                      key={fontKey}
                      className={`font-button ${isFontActive(fontKey)}`}
                      onClick={() => handleFontChange(fontKey)}
                      disabled={loading}
                      title={`Select ${fontInfo.name}`}
                    >
                      <div 
                        className="font-preview"
                        style={{
                          fontFamily: fontInfo.cssFont,
                          fontWeight: fontBold ? '700' : '400',
                          fontStyle: fontItalic ? 'italic' : 'normal',
                        }}
                      >
                        {fontInfo.previewText}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="font-current">
                  Using: <span 
                    className="font-current-preview"
                    style={{
                      fontFamily: FONTS[selectedFontKey as keyof typeof FONTS]?.cssFont || 'Arial, sans-serif',
                      fontWeight: fontBold ? '700' : '400',
                      fontStyle: fontItalic ? 'italic' : 'normal',
                    }}
                  >
                    {FONTS[selectedFontKey as keyof typeof FONTS]?.name || 'Default'}
                    {fontBold && ' Bold'}{fontItalic && ' Italic'}
                  </span>
                </div>
              </div>
            </ToolbarControl>
            <span className="tooltip">Choose text font style</span>
          </div>
        )}
      </div>
    </>
  );
}
