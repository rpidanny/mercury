import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * Renderer encapsulates a Three.js scene, camera, and WebGLRenderer.
 * It renders the given mesh into the specified container.
 */
export default class Renderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  constructor(containerSelector: string) {
    const container = document.querySelector(containerSelector) as HTMLElement;
    if (!container) {
      throw new Error(`Container not found: ${containerSelector}`);
    }
    this.container = container;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeeeeee);

    // Create camera with wider field of view
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 100000);
    this.camera.position.set(0, -width, width * 0.5);
    this.camera.up.set(0, 0, 1);
    this.camera.lookAt(0, 0, 0);

    // Add lights
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(0.5, -1, 1).normalize();
    this.scene.add(dir);
    // Add hemisphere light for better shading
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.scene.add(hemi);

    // Create WebGL renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height, true);
    container.innerHTML = "";
    container.appendChild(this.renderer.domElement);

    // Initialize orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
    this.controls.enableRotate = true;

    // Start animation loop
    this.animate();

    // Handle resize
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }

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
   * Adds the object to the scene and renders.
   * Clears previous meshes (preserving lights).
   */
  public renderMesh(object: THREE.Object3D): void {
    // Remove all existing objects except lights
    this.scene.children
      .filter((obj) => !(obj instanceof THREE.Light))
      .forEach((obj) => this.scene.remove(obj));

    // Add new mesh
    this.scene.add(object);

    // Apply contrasting materials and fit camera to mesh
    // object.traverse((child) => {
    //   if ((child as THREE.Mesh).isMesh) {
    //     const meshChild = child as THREE.Mesh;
    //     // add edge outlines for better visibility
    //     const geometry = meshChild.geometry as THREE.BufferGeometry;
    //     // only add edges if geometry has valid positions
    //     if (
    //       geometry.attributes.position &&
    //       geometry.attributes.position.count > 0
    //     ) {
    //       const edgesGeometry = new THREE.EdgesGeometry(geometry);
    //       const edgesMaterial = new THREE.LineBasicMaterial({
    //         color: 0x444444,
    //         linewidth: 1,
    //       });
    //       const edgesMesh = new THREE.LineSegments(
    //         edgesGeometry,
    //         edgesMaterial
    //       );
    //       meshChild.add(edgesMesh);
    //     }
    //   }
    // });

    // Compute bounding box and fit camera
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

    // Render once
    this.render();
  }

  /**
   * Renders the scene from the camera.
   */
  render(): void {
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
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const line = new THREE.LineLoop(geo, mat);
    this.scene.add(line);
  }
}
