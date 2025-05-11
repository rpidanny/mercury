import React from 'react';
import { ShapeType } from '../lib/types';

interface FormControlsProps {
  shape: ShapeType;
  onShapeChange: (shape: ShapeType) => void;
  widthMM: number;
  onWidthChange: (v: number) => void;
  altMult: number;
  onAltMultChange: (v: number) => void;
}

export function CompactFormControls({
  shape,
  onShapeChange,
  widthMM,
  onWidthChange,
  altMult,
  onAltMultChange,
}: FormControlsProps) {
  return (
    <>
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
    </>
  );
}

export function FullFormControls({
  shape,
  onShapeChange,
  widthMM,
  onWidthChange,
  altMult,
  onAltMultChange,
}: FormControlsProps) {
  return (
    <>
      <div className="mb-6">
        <label htmlFor="shape" className="block text-sm font-medium text-gray-700 mb-1">
          Shape
        </label>
        <select
          id="shape"
          value={shape}
          onChange={e => onShapeChange(e.target.value as ShapeType)}
          className="mt-2 w-full bg-transparent border-b border-gray-300 text-gray-900 focus:border-pink-500 focus:outline-none py-2 px-1 transition"
        >
          <option value="hexagon">Hexagon</option>
          <option value="square">Square</option>
          <option value="circle">Circle</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="modelWidth" className="block text-sm font-medium text-gray-700 mb-1">
            Model Width (mm)
          </label>
          <input
            type="number"
            id="modelWidth"
            value={widthMM}
            onChange={e => onWidthChange(+e.target.value)}
            min={10}
            className="mt-2 w-full bg-transparent border-b border-gray-300 text-gray-900 focus:border-pink-500 focus:outline-none py-2 px-1 transition"
          />
        </div>
        <div>
          <label htmlFor="altMult" className="block text-sm font-medium text-gray-700 mb-1">
            Altitude Multiplier
          </label>
          <input
            type="number"
            id="altMult"
            value={altMult}
            onChange={e => onAltMultChange(+e.target.value)}
            min={0.1}
            step={0.1}
            className="mt-2 w-full bg-transparent border-b border-gray-300 text-gray-900 focus:border-pink-500 focus:outline-none py-2 px-1 transition"
          />
        </div>
      </div>
    </>
  );
} 