import { useEffect } from 'react';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import './index.css';
import HomePage from './Pages/HomePage/HomePage';
import PreviewPage from './Pages/PreviewPage/PreviewPage';
import LoadingModal from './components/LoadingModal';
import { AppProvider, useAppContext } from './context/AppContext';
import Config from './lib/config';

const AppContent = () => {
  const { state, dispatch } = useAppContext();
  const { ui, resources } = state;
  const { loading, status } = ui;
  const { terrainData } = resources;

  // Load font on mount
  useEffect(() => {
    const loader = new FontLoader();
    loader.load(
      Config.FONT_URL,
      (loadedFont) => dispatch({ type: 'SET_FONT', payload: loadedFont }),
      undefined,
      () => dispatch({ type: 'SET_STATUS', payload: 'Error loading font, emboss disabled' })
    );
  }, [dispatch]);

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
