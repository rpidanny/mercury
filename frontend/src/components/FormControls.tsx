import { ShapeType } from '../lib/types';

interface FormControlsProps {
  shape: ShapeType;
  onShapeChange: (shape: ShapeType) => void;
  widthMM: number;
  onWidthChange: (v: number) => void;
  altMult: number;
  onAltMultChange: (v: number) => void;
}

interface CompactWidthControlProps {
  widthMM: number;
  onWidthChange: (v: number) => void;
}

export function CompactFormControls({
  widthMM,
  onWidthChange,
}: CompactWidthControlProps) {
  return (
    <>
      <div className="flex items-center space-x-2">
        <label className="font-medium text-sm text-slate-700">Width (mm):</label>
        <input
          type="number"
          value={widthMM}
          onChange={e => onWidthChange(+e.target.value)}
          min={10}
          className="input-field w-20 focus:outline-none"
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
      <div className="mb-5">
        <label htmlFor="shape" className="block text-sm font-medium text-slate-700 mb-1.5">
          Shape
        </label>
        <select
          id="shape"
          value={shape}
          onChange={e => onShapeChange(e.target.value as ShapeType)}
          className="input-field w-full focus:outline-none appearance-none"
        >
          <option value="hexagon">Hexagon</option>
          <option value="square">Square</option>
          <option value="circle">Circle</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label htmlFor="modelWidth" className="block text-sm font-medium text-slate-700 mb-1.5">
            Width (mm)
          </label>
          <input
            type="number"
            id="modelWidth"
            value={widthMM}
            onChange={e => onWidthChange(+e.target.value)}
            min={10}
            className="input-field w-full focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="altMult" className="block text-sm font-medium text-slate-700 mb-1.5">
            Alt. Multiplier
          </label>
          <input
            type="number"
            id="altMult"
            value={altMult}
            onChange={e => onAltMultChange(+e.target.value)}
            min={0.1}
            step={0.1}
            className="input-field w-full focus:outline-none"
          />
        </div>
      </div>
    </>
  );
} 