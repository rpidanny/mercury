import React, { useEffect, useRef } from 'react';
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
}: PreviewPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add('model-mode');
    if (containerRef.current) {
      const renderer = new Renderer('#scene-container');
      renderer.renderMesh(mesh);
    }
    return () => {
      document.body.classList.remove('model-mode');
    };
  }, [mesh]);

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
      
      <div className="absolute bottom-4 left-4 z-10 flex flex-col space-y-2 bg-white bg-opacity-80 p-3 rounded-lg shadow-lg">
        <CompactFormControls
          shape={shape}
          onShapeChange={onShapeChange}
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