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
    <div className="homepage-container">
      <section className="form-section">
        <div id="form-container">
          <h1 className="text-3xl font-extrabold gradient-text text-center mb-4">
            Mercury
          </h1>
          <h3 className="text-center text-slate-600 mb-6 font-light text-sm">
            Turn your adventure into a 3D view of the surrounding terrain
          </h3>

          <div className="mb-4">
            <label htmlFor="gpx" className="block text-sm font-medium text-slate-700 mb-1">
              Upload GPX File
            </label>
            <input
              type="file"
              accept=".gpx"
              id="gpx"
              onChange={e => dispatch({ type: 'SET_FILE', payload: e.target.files?.[0] ?? null })}
              className="input-field w-full focus:outline-none"
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

          <div className="mb-4">
            <label htmlFor="gridRes" className="block text-sm font-medium text-slate-700 mb-1">
              Grid Resolution
            </label>
            <input
              type="number"
              id="gridRes"
              value={gridRes}
              onChange={e => updateModelConfig({ gridRes: +e.target.value })}
              min={1}
              className="input-field w-full focus:outline-none"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="paddingFac" className="block text-sm font-medium text-slate-700 mb-1">
              Padding Factor
            </label>
            <input
              type="number"
              id="paddingFac"
              value={paddingFac}
              onChange={e => updateModelConfig({ paddingFac: +e.target.value })}
              min={1}
              step={0.05}
              className="input-field w-full focus:outline-none"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="embossText" className="block text-sm font-medium text-slate-700 mb-1">
              Text to Emboss (Optional)
            </label>
            <textarea
              id="embossText"
              value={embossText}
              onChange={e => updateModelConfig({ embossText: e.target.value })}
              rows={2}
              maxLength={50}
              className="input-field w-full focus:outline-none resize-none"
              placeholder="Your adventure name or date..."
            />
          </div>

          <button
            onClick={generateTerrain}
            disabled={loading}
            className="primary-button w-full text-white font-semibold rounded-full disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Generate 3D Terrain'}
          </button>
        </div>
      </section>
      
      <section className="preview-section">
        <div className="preview-overlay">
          <div className="preview-text">
            <div className="preview-badge">Example</div>
            <h3 className="text-slate-800 text-lg font-bold mb-1">Pokhara Marathon</h3>
            <p className="text-slate-600 text-xs">3D terrain model generated from a GPX route track</p>
          </div>
          
          <div className="model-preview">
            <img src="pokhara-model.jpg" alt="3D Terrain Model Example" />
          </div>
        </div>
      </section>
    </div>
  );
} 