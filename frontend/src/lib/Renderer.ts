import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * Represents the camera and controls state that can be saved and restored
 */
export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  zoom: number;
}

/**
 * Configuration options for the renderer
 */
export interface RendererOptions {
  enableContrast?: boolean;
  backgroundColor?: number;
}

/**
 * Renderer encapsulates a Three.js scene, camera, and WebGLRenderer.
 * It renders the given mesh into the specified container.
 */
export default class Renderer {
  private container: HTMLElement;
  private scene: THREE.Scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private currentMesh: THREE.Object3D | null = null;
  private options: RendererOptions = {
    enableContrast: false,
    backgroundColor: 0xeeeeee,
  };

  constructor(containerSelector: string, options?: RendererOptions) {
    const container = document.querySelector(containerSelector) as HTMLElement;
    if (!container) {
      throw new Error(`Container not found: ${containerSelector}`);
    }
    this.container = container;

    if (options) {
      this.options = { ...this.options, ...options };
    }

    this.initScene();
    this.initCamera();
    this.initLights();
    this.initRenderer();
    this.initControls();
    this.setupEventListeners();
    this.animate();
  }

  /**
   * Initialize the Three.js scene
   */
  private initScene(): void {
    this.scene.background = new THREE.Color(this.options.backgroundColor);
  }

  /**
   * Initialize the camera
   */
  private initCamera(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 100000);
    this.camera.position.set(0, -width, width * 0.5);
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Initialize lighting for the scene
   */
  private initLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    const directional = new THREE.DirectionalLight(0xffffff, 1.2);
    const hemisphere = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);

    directional.position.set(0.5, -1, 1).normalize();

    this.scene.add(ambient);
    this.scene.add(directional);
    this.scene.add(hemisphere);
  }

  /**
   * Initialize the WebGL renderer
   */
  private initRenderer(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height, true);

    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);
  }

  /**
   * Initialize orbit controls
   */
  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
    this.controls.enableRotate = true;
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }

  /**
   * Handle window resize events
   */
  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, true);
    this.controls.update();

    this.render();
  }

  /**
   * Get the current camera state which can be saved and restored later
   */
  public getCameraState(): CameraState {
    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
      zoom: this.camera.zoom,
    };
  }

  /**
   * Restore a previously saved camera state
   */
  public setCameraState(state: CameraState): void {
    this.camera.position.copy(state.position);
    this.controls.target.copy(state.target);
    this.camera.zoom = state.zoom;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.render();
  }

  /**
   * Replace the mesh while preserving camera position
   */
  public updateMeshPreserveCamera(object: THREE.Object3D): void {
    const cameraState = this.getCameraState();
    this.clearSceneObjects();
    this.addObjectToScene(object);
    this.setCameraState(cameraState);
    this.render();
  }

  /**
   * Remove all non-light objects from the scene
   */
  private clearSceneObjects(): void {
    this.scene.children
      .filter((obj) => !(obj instanceof THREE.Light))
      .forEach((obj) => this.scene.remove(obj));
  }

  /**
   * Add an object to the scene and set as current mesh
   */
  private addObjectToScene(object: THREE.Object3D): void {
    this.scene.add(object);
    this.currentMesh = object;
  }

  /**
   * Apply contrasting materials to make the mesh more visible
   * This is disabled by default and can be enabled via options
   */
  private applyContrastingMaterials(object: THREE.Object3D): void {
    if (!this.options.enableContrast) return;

    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const meshChild = child as THREE.Mesh;
        // add edge outlines for better visibility
        const geometry = meshChild.geometry as THREE.BufferGeometry;
        // only add edges if geometry has valid positions
        if (
          geometry.attributes.position &&
          geometry.attributes.position.count > 0
        ) {
          const edgesGeometry = new THREE.EdgesGeometry(geometry);
          const edgesMaterial = new THREE.LineBasicMaterial({
            color: 0x444444,
            linewidth: 1,
          });
          const edgesMesh = new THREE.LineSegments(
            edgesGeometry,
            edgesMaterial
          );
          meshChild.add(edgesMesh);
        }
      }
    });
  }

  /**
   * Adds the object to the scene and renders.
   * Clears previous meshes (preserving lights).
   */
  public renderMesh(object: THREE.Object3D): void {
    this.clearSceneObjects();
    this.addObjectToScene(object);

    // Apply contrasting materials if enabled
    this.applyContrastingMaterials(object);

    this.fitCameraToObject(object);
    this.render();
  }

  /**
   * Adjust the camera to frame the object properly
   */
  private fitCameraToObject(object: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
    cameraDistance *= 1.5; // increase margin for better framing

    // Reposition camera along current direction
    const direction = new THREE.Vector3()
      .subVectors(this.camera.position, this.controls.target)
      .normalize();
    const newPos = center.clone().add(direction.multiplyScalar(cameraDistance));

    this.camera.position.copy(newPos);
    this.camera.lookAt(center);
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(center);
    this.controls.update();
  }

  /**
   * Renders the scene from the camera.
   */
  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Animation loop to update controls and render.
   */
  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.render();
  };

  /**
   * Enable or disable contrasting materials
   */
  public setContrastMode(enable: boolean): void {
    this.options.enableContrast = enable;

    // Re-render the current mesh with the new contrast setting if one exists
    if (this.currentMesh) {
      this.renderMesh(this.currentMesh);
    }
  }

  /**
   * Draws a boundary outline given an array of 2D points (in mm units).
   * Existing mesh is already rendered; call after renderMesh.
   */
  public drawBoundary(
    points2D: { x: number; y: number }[],
    height: number = 0
  ): void {
    if (points2D.length === 0) return;

    // Convert to 3D points
    const pts: THREE.Vector3[] = points2D.map(
      (p) => new THREE.Vector3(p.x, p.y, height)
    );

    // Close the loop
    pts.push(pts[0].clone());

    // Create line geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(pts);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const line = new THREE.LineLoop(geometry, material);

    this.scene.add(line);
    this.render();
  }
}
