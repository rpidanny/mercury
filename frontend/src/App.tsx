import { useEffect } from 'react';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import './index.css';
import HomePage from './Pages/HomePage/HomePage';
import PreviewPage from './Pages/PreviewPage/PreviewPage';
import LoadingModal from './components/LoadingModal';
import { AppProvider, useAppContext } from './context/AppContext';
import Config from './lib/config';
import { FONTS, DEFAULT_FONT_KEY } from './lib/fonts';

const AppContent = () => {
  const { state, dispatch } = useAppContext();
  const { ui, resources, modelConfig } = state;
  const { loading, status } = ui;
  const { terrainData, fonts } = resources;
  const { selectedFontKey, fontBold } = modelConfig;

  // Load fonts on mount and when font selection changes
  useEffect(() => {
    const loader = new FontLoader();
    
    // Load the default font on mount and store it with its key
    loader.load(
      Config.FONT_URL,
      (loadedFont) => {
        dispatch({ type: 'SET_FONT', payload: loadedFont });
        // Also store the default font with its key for consistency
        dispatch({ type: 'SET_FONTS', payload: { key: `${DEFAULT_FONT_KEY}_bold`, font: loadedFont } });
      },
      undefined,
      () => dispatch({ type: 'SET_STATUS', payload: 'Error loading default font, emboss disabled' })
    );
  }, [dispatch]);

  // Load selected font when font selection or bold changes
  useEffect(() => {
    const selectedFont = FONTS[selectedFontKey as keyof typeof FONTS];
    if (!selectedFont) return;

    const fontVariantKey = `${selectedFontKey}_${fontBold ? 'bold' : 'regular'}`;
    if (fonts[fontVariantKey]) {
      // Font variant already loaded, just set it as current
      dispatch({ type: 'SET_FONT', payload: fonts[fontVariantKey] });
      return;
    }

    const loader = new FontLoader();
    const fontUrl = fontBold ? selectedFont.boldUrl : selectedFont.regularUrl;
    
    loader.load(
      fontUrl,
      (loadedFont) => {
        dispatch({ type: 'SET_FONTS', payload: { key: fontVariantKey, font: loadedFont } });
        dispatch({ type: 'SET_FONT', payload: loadedFont }); // Set as current font
      },
      undefined,
      (error) => {
        console.error(`Error loading font ${selectedFont.name} ${fontBold ? 'Bold' : 'Regular'}:`, error);
        dispatch({ type: 'SET_STATUS', payload: `Error loading font ${selectedFont.name}` });
      }
    );
  }, [selectedFontKey, fontBold, fonts, dispatch]);

  return (
    <>
      <LoadingModal message={status || (loading ? 'Loading...' : null)} />
      
      {terrainData ? <PreviewPage /> : <HomePage />}
    </>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
