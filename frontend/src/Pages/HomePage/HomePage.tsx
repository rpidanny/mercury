import { useAppContext } from '../../context/AppContext';
import { useTerrain } from '../../hooks/useTerrain';
import { FullFormControls } from '../../components/FormControls';
import './HomePage.css';

export default function HomePage() {
  const { state, dispatch, updateModelConfig } = useAppContext();
  const { ui, modelConfig } = state;
  const { loading } = ui;
  const { shape, widthMM, altMult, gridRes, coverageFactor: coverageFactor, embossText } = modelConfig;
  const { generateTerrain } = useTerrain();

  return (
    <div className="homepage-container">
      <section className="form-section">
        <div id="form-container">
          <h1 className="text-3xl font-extrabold gradient-text text-center mb-4">
            Mercury
          </h1>
          <h3 className="text-center text-slate-600 mb-6 font-light text-sm">
            Transform your adventure into stunning 3D terrain
          </h3>

          <div className="mb-5">
            <label htmlFor="gpx" className="block text-sm font-medium text-slate-700 mb-1.5">
              Adventure Track
            </label>
            <input
              type="file"
              accept=".gpx"
              id="gpx"
              onChange={e => dispatch({ type: 'SET_FILE', payload: e.target.files?.[0] ?? null })}
              className="input-field w-full focus:outline-none"
              placeholder="Select your GPX track file"
            />
            <p className="text-xs text-slate-500 mt-1">Upload a .gpx file from your hike, run, or bike ride</p>
          </div>

          <FullFormControls
            shape={shape}
            onShapeChange={(shape) => updateModelConfig({ shape })}
            widthMM={widthMM}
            onWidthChange={(widthMM) => updateModelConfig({ widthMM })}
            altMult={altMult}
            onAltMultChange={(altMult) => updateModelConfig({ altMult })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label htmlFor="gridRes" className="block text-sm font-medium text-slate-700 mb-1.5">
                Detail Level
              </label>
              <input
                type="number"
                id="gridRes"
                value={gridRes}
                onChange={e => updateModelConfig({ gridRes: +e.target.value })}
                min={1}
                className="input-field w-full focus:outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Higher values increase model detail</p>
            </div>
            <div>
              <label htmlFor="coverageFactor" className="block text-sm font-medium text-slate-700 mb-1.5">
                Coverage Factor
              </label>
              <input
                type="number"
                id="coverageFactor"
                value={coverageFactor}
                onChange={e => updateModelConfig({ coverageFactor: +e.target.value })}
                min={1}
                step={0.05}
                className="input-field w-full focus:outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Determines how much surrounding terrain is included in your model</p>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="embossText" className="block text-sm font-medium text-slate-700 mb-1.5">
              Personalize Your Model
            </label>
            <textarea
              id="embossText"
              value={embossText}
              onChange={e => updateModelConfig({ embossText: e.target.value })}
              rows={2}
              maxLength={50}
              className="input-field w-full focus:outline-none resize-none"
              placeholder="Add name, date, or achievement..."
            />
            <p className="text-xs text-slate-500 mt-1">Text will be embossed on your 3D model</p>
          </div>

          <button
            onClick={generateTerrain}
            disabled={loading}
            className="primary-button w-full text-white font-semibold rounded-full disabled:opacity-50"
          >
            {loading ? 'Creating Your Model...' : 'Generate 3D Terrain'}
          </button>
        </div>
      </section>
      
      <section className="preview-section">
        <div className="preview-overlay">
          <div className="preview-text">
            <div className="preview-badge">Featured</div>
            <h3 className="text-slate-800 text-lg font-bold mb-1">Pokhara Marathon</h3>
            <p className="text-slate-600 text-xs">Breathtaking 3D terrain model showcasing the scenic Pokhara Marathon 2025 route</p>
          </div>
          
          <div className="model-preview">
            <img src="/pokhara-model.jpg" alt="3D Terrain Model Example" />
          </div>
        </div>
      </section>
    </div>
  );
} 
