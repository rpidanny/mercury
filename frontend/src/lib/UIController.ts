import * as THREE from "three";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

import Config from "./config";
import Renderer from "@/Renderer";
import GPXParser from "./GPXParser";
import TerrainGenerator from "./TerrainGenerator";
import ModelBuilder from "./ModelBuilder";
import { LatLon, ShapeType } from "./types";
import { IShape } from "./shapes/IShape";
import HexagonShape from "./shapes/HexagonShape";
import SquareShape from "./shapes/SquareShape";
import CircleShape from "./shapes/CircleShape";

export default class UIController {
  private gpxInput = document.getElementById("gpx-file") as HTMLInputElement;
  private widthInput = document.getElementById(
    "model-width"
  ) as HTMLInputElement;
  private altInput = document.getElementById(
    "alt-multiplier"
  ) as HTMLInputElement;
  private textInput = document.getElementById(
    "emboss-text"
  ) as HTMLTextAreaElement;
  private gridInput = document.getElementById(
    "grid-resolution"
  ) as HTMLInputElement;
  private paddingInput = document.getElementById(
    "padding-factor"
  ) as HTMLInputElement;
  private shapeSelect = document.getElementById(
    "shape-type"
  ) as HTMLSelectElement;
  private generateBtn = document.getElementById(
    "generate-btn"
  ) as HTMLButtonElement;
  private downloadBtn = document.getElementById(
    "download-btn"
  ) as HTMLButtonElement;
  private statusText = document.getElementById(
    "status-text"
  ) as HTMLSpanElement;
  private loadingIndicator = document.getElementById(
    "loading-indicator"
  ) as HTMLElement;

  private renderer!: Renderer;
  private trackPoints: LatLon[] | null = null;

  private loadedFont: Font | null = null;
  private finalMesh: THREE.Object3D | null = null;

  init(): void {
    this.loadFont();
    this.shapeSelect.addEventListener("change", () => {
      this.updateMesh();
    });
    // Re-generate geometry on parameter changes (no refetch)
    this.widthInput.addEventListener("input", () => this.updateMesh());
    this.altInput.addEventListener("input", () => this.updateMesh());
    this.gridInput.addEventListener("input", () => this.updateMesh());
    this.paddingInput.addEventListener("input", () => this.updateMesh());
    this.generateBtn.addEventListener("click", () => this.onGenerate());
    this.downloadBtn.addEventListener("click", () => this.onDownload());
    // Renderer will be initialized on model generation when container is visible
  }

  private loadFont(): void {
    const loader = new FontLoader();
    loader.load(
      Config.FONT_URL,
      (font: Font) => {
        this.loadedFont = font;
        this.setStatus("", false, false);
      },
      undefined,
      (err: unknown) => {
        console.error("Font load error", err);
        this.setStatus("Error loading font, emboss disabled", true, false);
      }
    );
  }

  private setStatus(msg: string, isError = false, showSpinner = false): void {
    this.statusText.textContent = msg;
    this.statusText.style.color = isError ? "#dc2626" : "#4b5563";
    this.loadingIndicator.style.display = showSpinner ? "inline-block" : "none";
  }

  private getParams(requireFile: boolean = false): {
    file?: File;
    widthVal: number;
    altVal: number;
    gridRes: number;
    paddingVal: number;
    shapeType: ShapeType;
    embossText: string;
  } {
    const embossText = this.textInput.value.trim();
    if (!this.loadedFont && embossText) {
      throw new Error("Font still loading, please wait");
    }
    let file: File | undefined;
    if (requireFile) {
      file = this.gpxInput.files?.[0];
      if (!file) {
        throw new Error("Select a GPX file");
      }
    }
    const widthVal = parseFloat(this.widthInput.value);
    if (isNaN(widthVal) || widthVal <= 0) {
      throw new Error("Invalid model width");
    }
    const altVal = parseFloat(this.altInput.value);
    if (isNaN(altVal) || altVal <= 0) {
      throw new Error("Invalid altitude multiplier");
    }
    const gridRes = parseInt(this.gridInput.value, 10);
    if (isNaN(gridRes) || gridRes <= 0) {
      throw new Error("Invalid grid resolution");
    }
    const paddingVal = parseFloat(this.paddingInput.value);
    if (isNaN(paddingVal) || paddingVal <= 0) {
      throw new Error("Invalid padding factor");
    }
    const shapeType = this.shapeSelect.value as ShapeType;
    return {
      file,
      widthVal,
      altVal,
      gridRes,
      paddingVal,
      shapeType,
      embossText,
    };
  }

  private async onGenerate(): Promise<void> {
    // Parse and validate inputs
    let params;
    try {
      params = this.getParams(true);
    } catch (err: any) {
      this.setStatus(err.message, true, false);
      return;
    }
    const {
      file,
      widthVal,
      altVal,
      gridRes,
      paddingVal,
      shapeType,
      embossText,
    } = params;

    this.setStatus("Parsing GPX...", false, true);
    this.generateBtn.disabled = true;
    this.downloadBtn.disabled = true;
    this.downloadBtn.classList.add("hidden");

    try {
      const text = await file!.text();
      const trackPoints: LatLon[] = GPXParser.parse(text);
      this.trackPoints = trackPoints;

      this.setStatus("Generating terrain data...", false, true);
      const terrainData = await TerrainGenerator.generate(
        trackPoints,
        gridRes,
        paddingVal
      );

      this.setStatus("Building 3D model...", false, true);
      const result = ModelBuilder.build(
        terrainData,
        widthVal,
        altVal,
        shapeType,
        embossText,
        this.loadedFont
      );
      this.finalMesh = result.mesh;
      // Switch to full-screen model mode by adding class to body
      document.body.classList.add("model-mode");
      // Initialize renderer now that scene container is visible
      this.renderer = new Renderer("#scene-container");
      // Render mesh and draw bounding outline
      this.renderer.renderMesh(this.finalMesh!);
      // Draw boundary using selected shape
      let shape2D: IShape;
      const widthGeo = terrainData.widthGeo;
      switch (shapeType) {
        case "hexagon":
          shape2D = new HexagonShape(widthGeo / Math.sqrt(3));
          break;
        case "square":
          shape2D = new SquareShape(widthGeo);
          break;
        case "circle":
          shape2D = new CircleShape(widthGeo / 2);
          break;
        default:
          shape2D = new SquareShape(widthGeo);
      }
      const scale = widthVal / widthGeo;
      const boundary2D = shape2D
        .getVertices()
        .map((v: { x: number; y: number }) => ({
          x: v.x * scale,
          y: v.y * scale,
        }));
      this.renderer.drawBoundary(boundary2D);

      const msg =
        "Model generated" +
        (result.textOverlapWarning ? " (text overlap!)" : "");
      this.setStatus(msg, false, false);
      this.downloadBtn.disabled = false;
      this.downloadBtn.classList.remove("hidden");
      // Renderer and scene have been updated to full-screen mode
    } catch (err: any) {
      console.error(err);
      this.setStatus(err.message || "Error", true, false);
    } finally {
      this.generateBtn.disabled = false;
    }
  }

  private onDownload(): void {
    if (!this.finalMesh) {
      this.setStatus("No model to download", true, false);
      return;
    }
    this.setStatus("Exporting STL...", false, true);
    setTimeout(() => {
      try {
        const exporter = new STLExporter();
        // Cast finalMesh to any for STL export
        const stlData = exporter.parse(this.finalMesh! as any, {
          binary: true,
        });
        const blob = new Blob([stlData], {
          type: "application/vnd.ms-pki.stl",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `terrain_${Date.now()}.stl`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        this.setStatus("STL ready", false, false);
      } catch (err: any) {
        console.error(err);
        this.setStatus("Export error", true, false);
      }
    }, 50);
  }

  private async updateMesh(): Promise<void> {
    // Only update if model data is available
    if (!this.trackPoints) return;
    // Parse and validate inputs for updating
    let params;
    try {
      params = this.getParams(false);
    } catch (err: any) {
      this.setStatus(err.message, true, false);
      return;
    }
    const { widthVal, altVal, gridRes, paddingVal, shapeType, embossText } =
      params;
    this.setStatus("Updating 3D model...", false, true);
    try {
      // Regenerate terrain and model
      const terrainData = await TerrainGenerator.generate(
        this.trackPoints,
        gridRes,
        paddingVal
      );
      const result = ModelBuilder.build(
        terrainData,
        widthVal,
        altVal,
        shapeType,
        embossText,
        this.loadedFont
      );
      this.finalMesh = result.mesh;
      this.renderer.renderMesh(result.mesh);
      // Update boundary outline
      let shape2D: IShape;
      const widthGeo = terrainData.widthGeo;
      switch (shapeType) {
        case "hexagon":
          shape2D = new HexagonShape(widthGeo / Math.sqrt(3));
          break;
        case "square":
          shape2D = new SquareShape(widthGeo);
          break;
        case "circle":
          shape2D = new CircleShape(widthGeo / 2);
          break;
        default:
          shape2D = new SquareShape(widthGeo);
      }
      const scale = widthVal / widthGeo;
      const boundary2D = shape2D
        .getVertices()
        .map((v: { x: number; y: number }) => ({
          x: v.x * scale,
          y: v.y * scale,
        }));
      this.renderer.drawBoundary(boundary2D);
      this.setStatus("Model updated", false, false);
    } catch (e: any) {
      this.setStatus(e.message || "Update error", true, false);
    }
  }
}
