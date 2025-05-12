import { useAppContext } from '../../context/AppContext';
import { useTerrain } from '../../hooks/useTerrain';
import { FullFormControls } from '../../components/FormControls';
import './HomePage.css';

export default function HomePage() {
  const { state, dispatch, updateModelConfig } = useAppContext();
  const { ui, modelConfig } = state;
  const { loading } = ui;
  const { shape, widthMM, altMult, gridRes, paddingFac, embossText } = modelConfig;
  const { generateTerrain } = useTerrain();

  return (
    <div
      id="form-container"
      className="max-w-lg mx-auto mt-12 bg-white bg-opacity-10 backdrop-blur-lg p-8 rounded-xl border border-white/20 shadow-xl"
    >
      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 text-center mb-8">
        Mercury
      </h1>
      <h3 className="text-center text-gray-400 mb-8">
        Turn your adventure into a 3D view of the surrounding terrain
      </h3>

      <div className="mb-6">
        <label htmlFor="gpx" className="block text-sm font-medium text-gray-700 mb-1">
          Upload GPX File
        </label>
        <input
          type="file"
          accept=".gpx"
          id="gpx"
          onChange={e => dispatch({ type: 'SET_FILE', payload: e.target.files?.[0] ?? null })}
          className="mt-2 w-full bg-transparent border-b border-gray-300 text-gray-900 placeholder-gray-400 focus:border-pink-500 focus:outline-none py-2 px-1 transition"
        />
      </div>

      <FullFormControls
        shape={shape}
        onShapeChange={(shape) => updateModelConfig({ shape })}
        widthMM={widthMM}
        onWidthChange={(widthMM) => updateModelConfig({ widthMM })}
        altMult={altMult}
        onAltMultChange={(altMult) => updateModelConfig({ altMult })}
      />

      <div className="mb-6">
        <label htmlFor="gridRes" className="block text-sm font-medium text-gray-700 mb-1">
          Grid Resolution
        </label>
        <input
          type="number"
          id="gridRes"
          value={gridRes}
          onChange={e => updateModelConfig({ gridRes: +e.target.value })}
          min={1}
          className="mt-2 w-full bg-transparent border-b border-gray-300 text-gray-900 focus:border-pink-500 focus:outline-none py-2 px-1 transition"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="paddingFac" className="block text-sm font-medium text-gray-700 mb-1">
          Padding Factor
        </label>
        <input
          type="number"
          id="paddingFac"
          value={paddingFac}
          onChange={e => updateModelConfig({ paddingFac: +e.target.value })}
          min={1}
          step={0.05}
          className="mt-2 w-full bg-transparent border-b border-gray-300 text-gray-900 focus:border-pink-500 focus:outline-none py-2 px-1 transition"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="embossText" className="block text-sm font-medium text-gray-700 mb-1">
          Text to Emboss (Optional)
        </label>
        <textarea
          id="embossText"
          value={embossText}
          onChange={e => updateModelConfig({ embossText: e.target.value })}
          rows={2}
          maxLength={50}
          className="mt-2 w-full bg-transparent border-b border-gray-300 text-gray-900 placeholder-gray-400 focus:border-pink-500 focus:outline-none py-2 px-1 rounded-md transition resize-none"
        />
      </div>

      <button
        onClick={generateTerrain}
        disabled={loading}
        className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold py-3 rounded-full shadow-lg transition duration-300 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Generate 3D Terrain'}
      </button>
    </div>
  );
} 