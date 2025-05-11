import React, { useEffect, useRef } from 'react';
import Renderer from '../../lib/Renderer';
import { ShapeType } from '../../lib/types';
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
      <div className="absolute bottom-4 left-4 z-10 flex flex-col space-y-2 bg-white bg-opacity-80 p-3 rounded-lg shadow-lg">
        <div className="flex items-center space-x-2">
          <label className="font-medium text-sm text-gray-700">Shape:</label>
          <select
            value={shape}
            onChange={e => onShapeChange(e.target.value as ShapeType)}
            className="border-gray-300 rounded p-1 bg-white text-sm"
          >
            <option value="hexagon">Hexagon</option>
            <option value="square">Square</option>
            <option value="circle">Circle</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <label className="font-medium text-sm text-gray-700">Width (mm):</label>
          <input
            type="number"
            value={widthMM}
            onChange={e => onWidthChange(+e.target.value)}
            min={10}
            className="w-20 border-gray-300 rounded p-1 bg-white text-sm"
          />
        </div>
        <div className="flex items-center space-x-2">
          <label className="font-medium text-sm text-gray-700">Altitude:</label>
          <input
            type="number"
            value={altMult}
            onChange={e => onAltMultChange(+e.target.value)}
            min={0.1}
            step={0.1}
            className="w-20 border-gray-300 rounded p-1 bg-white text-sm"
          />
        </div>
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