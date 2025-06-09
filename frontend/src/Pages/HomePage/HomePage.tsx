import { useAppContext } from '../../context/AppContext';
import { useTerrain } from '../../hooks/useTerrain';
import './HomePage.css';
import { useState } from 'react';
import { ShapeType } from '../../lib/types';

export default function HomePage() {
  const { state, dispatch, updateModelConfig, setLowPolyMode } = useAppContext();
  const { ui, modelConfig } = state;
  const { loading } = ui;
  const { shape, widthMM, altMult, modelResolution, paddingFactor, embossText, lowPolyMode } = modelConfig;
  const { generateTerrain } = useTerrain();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Floating geometric elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-40 left-20 w-28 h-28 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-xl"></div>
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light text-slate-900 tracking-tight mb-4">Mercury</h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto font-light">
            Transform your GPS adventures into stunning 3D terrain models
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Form Section - Compact */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/50">
              <h2 className="text-xl font-medium text-slate-900 mb-6">Create Your Model</h2>
              {/* Compact Form Grid */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* File Upload */}
                <div className="md:col-span-2">
                  <label htmlFor="gpx" className="block text-sm font-medium text-slate-800 mb-2">
                    Adventure Track
                  </label>
                  <input
                    type="file"
                    accept=".gpx"
                    id="gpx"
                    onChange={e => dispatch({ type: 'SET_FILE', payload: e.target.files?.[0] ?? null })}
                    className="w-full p-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 text-sm"
                  />
                </div>

                {/* Model Shape */}
                <div>
                  <label htmlFor="shape" className="block text-sm font-medium text-slate-800 mb-2">
                    Model Shape
                  </label>
                  <select
                    id="shape"
                    value={shape}
                    onChange={e => updateModelConfig({ shape: e.target.value as ShapeType })}
                    className="w-full p-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 text-sm appearance-none"
                    disabled={loading}
                  >
                    <option value="hexagon">Hexagon</option>
                    <option value="square">Square</option>
                    <option value="circle">Circle</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Choose the shape of your 3D terrain model</p>
                </div>

                {/* Model Size */}
                <div>
                  <label htmlFor="modelWidth" className="block text-sm font-medium text-slate-800 mb-2">
                    Model Size
                  </label>
                  <input
                    type="number"
                    id="modelWidth"
                    value={widthMM}
                    onChange={e => updateModelConfig({ widthMM: +e.target.value })}
                    min={10}
                    className="w-full p-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 text-sm"
                    placeholder="200"
                    disabled={loading}
                  />
                  <p className="text-xs text-slate-500 mt-1">Width in millimeters</p>
                </div>

                {/* Altitude Multiplier */}
                <div>
                  <label htmlFor="altMult" className="block text-sm font-medium text-slate-800 mb-2">
                    Altitude Multiplier
                  </label>
                  <input
                    type="number"
                    id="altMult"
                    value={altMult}
                    onChange={e => updateModelConfig({ altMult: +e.target.value })}
                    min={0.1}
                    step={0.1}
                    className="w-full p-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 text-sm"
                    placeholder="3.0"
                    disabled={loading}
                  />
                  <p className="text-xs text-slate-500 mt-1">Scales elevation to make altitude more prominent</p>
                </div>

                {/* Padding Factor */}
                <div>
                  <label htmlFor="paddingFactor" className="block text-sm font-medium text-slate-800 mb-2">
                    Padding Factor
                  </label>
                  <input
                    type="number"
                    id="paddingFactor"
                    value={paddingFactor}
                    onChange={e => updateModelConfig({ paddingFactor: +e.target.value })}
                    min={1}
                    step={0.05}
                    className="w-full p-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 text-sm"
                    placeholder="4.0"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Extra area around your route (as a multiple of route width/height)
                  </p>
                </div>

                {/* Model Resolution - Full Width */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-800 mb-2">
                    Model Resolution
                  </label>
                  <div className="flex space-x-2">
                    {[
                      { value: 100, label: 'Low' },
                      { value: 1000, label: 'Medium' },
                      { value: 2500, label: 'High' }
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                          modelResolution === value
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        onClick={() => updateModelConfig({ modelResolution: value })}
                        disabled={loading}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Engraving */}
                <div>
                  <label htmlFor="embossText" className="block text-sm font-medium text-slate-800 mb-2">
                    Custom Engraving
                  </label>
                  <input
                    type="text"
                    id="embossText"
                    value={embossText}
                    onChange={e => updateModelConfig({ embossText: e.target.value })}
                    maxLength={50}
                    className="w-full p-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 text-sm"
                    placeholder="Engrave your message..."
                  />
                  <p className="text-xs text-slate-500 mt-1">Text that will be permanently engraved into your model</p>
                </div>

                {/* Model Detail Toggle */}
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-2">
                    Model Detail
                  </label>
                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm text-slate-600 flex-1">
                      {lowPolyMode ? 'Low Poly' : 'Detailed'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lowPolyMode}
                        onChange={e => setLowPolyMode(e.target.checked)}
                        disabled={loading}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Choose between smooth detailed geometry or clean low poly surfaces</p>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateTerrain}
                disabled={loading}
                className="w-full py-3 px-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl font-medium hover:from-slate-800 hover:to-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[0.99] shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Magic...</span>
                  </div>
                ) : (
                  'Generate 3D Terrain'
                )}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 shadow-xl border border-white/50">
              <h3 className="font-medium text-slate-900 mb-4">Preview</h3>
              
              <div 
                className="relative rounded-2xl overflow-hidden mb-3 group cursor-pointer"
                onClick={() => setIsImageModalOpen(true)}
              >
                <img 
                  src="/pokhara-model.jpg" 
                  alt="3D Terrain Example" 
                  className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent group-hover:from-black/30"></div>
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium text-slate-700 rounded-full">
                    Featured
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-1">Pokhara Marathon</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Stunning 3D terrain showcasing the scenic marathon route with elevation details.
                </p>
              </div>
            </div>

            {/* Quick Guide */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 shadow-xl border border-white/50">
              <h3 className="font-medium text-slate-900 mb-4">How it works</h3>
              
              <div className="space-y-3">
                {[
                  { step: '1', title: 'Upload GPX', desc: 'Your adventure track' },
                  { step: '2', title: 'Customize', desc: 'Size & style options' },
                  { step: '3', title: 'Generate', desc: '3D-printable model' }
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-slate-600">{step}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">{title}</div>
                      <div className="text-xs text-slate-600">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {isImageModalOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src="/pokhara-model.jpg" 
              alt="3D Terrain Model - Pokhara Marathon" 
              className="w-full h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 
