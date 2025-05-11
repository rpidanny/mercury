import React, { useState, useEffect } from 'react';
import GPXParser from './lib/GPXParser';
import TerrainGenerator from './lib/TerrainGenerator';
import type { TerrainData } from './lib/TerrainGenerator';
import ModelBuilder from './lib/ModelBuilder';
import Config from './lib/config';
import { ShapeType } from './lib/types';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import type { Object3D } from 'three';
import './index.css';
import HomePage from './Pages/HomePage/HomePage';
import PreviewPage from './Pages/PreviewPage/PreviewPage';
import LoadingModal from './components/LoadingModal';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [shape, setShape] = useState<ShapeType>('hexagon');
  const [widthMM, setWidthMM] = useState<number>(100);
  const [altMult, setAltMult] = useState<number>(1);
  const [gridRes, setGridRes] = useState<number>(500);
  const [paddingFac, setPaddingFac] = useState<number>(4.0);
  const [embossText, setEmbossText] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [font, setFont] = useState<Font | null>(null);
  const [mesh, setMesh] = useState<Object3D | null>(null);
  const [terrainData, setTerrainData] = useState<TerrainData | null>(null);

  // Load font on mount
  useEffect(() => {
    const loader = new FontLoader();
    loader.load(
      Config.FONT_URL,
      (f: Font) => setFont(f),
      undefined,
      () => setStatus('Error loading font, emboss disabled')
    );
  }, []);

  const handleGenerate = async () => {
    if (!file) { setStatus('Select a GPX file'); return; }
    if (!font && embossText) { setStatus('Font loading, please wait'); return; }
    setLoading(true);
    try {
      let data = terrainData;
      if (!data) {
        setStatus('Parsing GPX...');
        const text = await file.text();
        const pts = GPXParser.parse(text, 10);
        setStatus('Generating terrain...');
        data = await TerrainGenerator.generate(pts, gridRes, paddingFac);
        setTerrainData(data);
      }
      setStatus('Building 3D model...');
      const result = ModelBuilder.build(
        data!,
        widthMM,
        altMult,
        shape,
        embossText,
        font
      );
      setMesh(result.mesh);
      setStatus('');
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // Update model using existing terrain data without refetching
  const handleUpdateModel = async () => {
    if (!terrainData) {
      setStatus('No terrain data available, please regenerate');
      return;
    }
    if (!font && embossText) {
      setStatus('Font loading, please wait');
      return;
    }
    setLoading(true);
    try {
      setStatus('Building 3D model...');
      const result = ModelBuilder.build(
        terrainData,
        widthMM,
        altMult,
        shape,
        embossText,
        font
      );
      setMesh(result.mesh);
      setStatus('');
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!mesh) return;
    const exporter = new STLExporter();
    const stlString = exporter.parse(mesh);
    const blob = new Blob([stlString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.stl';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Switch between form page and 3D preview page
  return (
    <>
      <LoadingModal message={status || (loading ? 'Loading...' : null)} />
      {mesh ? (
        <PreviewPage
          mesh={mesh}
          onDownload={handleDownload}
          shape={shape}
          onShapeChange={setShape}
          widthMM={widthMM}
          onWidthChange={setWidthMM}
          altMult={altMult}
          onAltMultChange={setAltMult}
          onRegenerate={handleUpdateModel}
          loading={loading}
        />
      ) : (
        <HomePage
          onFileChange={setFile}
          shape={shape}
          onShapeChange={setShape}
          widthMM={widthMM}
          onWidthChange={setWidthMM}
          altMult={altMult}
          onAltMultChange={setAltMult}
          gridRes={gridRes}
          onGridResChange={setGridRes}
          paddingFac={paddingFac}
          onPaddingFacChange={setPaddingFac}
          embossText={embossText}
          onEmbossTextChange={setEmbossText}
          loading={loading}
          onGenerate={handleGenerate}
        />
      )}
    </>
  );
}

export default App;
