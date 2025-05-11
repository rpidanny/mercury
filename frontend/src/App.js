import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [elevationData, setElevationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchElevation = async () => {
    setLoading(true);
    setError(null);
    try {
      // Example coordinates, replace with actual GPX data processing
      const response = await fetch('/api/elevation?lat=40.7128&lon=-74.0060');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setElevationData(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>GPX Terrain Visualizer</h1>
        <input type="file" accept=".gpx" onChange={(e) => console.log(e.target.files[0])} />
        <button onClick={fetchElevation} disabled={loading}>
          {loading ? 'Loading Elevation...' : 'Fetch Elevation Data (Example)'}
        </button>
        {error && <p style={{color: 'red'}}>Error: {error}</p>}
        {elevationData && (
          <div>
            <h2>Elevation Data:</h2>
            <pre>{JSON.stringify(elevationData, null, 2)}</pre>
          </div>
        )}
        <p>
          Upload a GPX file and visualize the terrain (3D model coming soon!).
        </p>
      </header>
    </div>
  );
}

export default App; 