"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

import type { ThingportMeshFormat } from "@homarr/integrations/types";

// Further than this between press and release is a spin, not a click to open the model.
const CLICK_SLOP_PX = 6;
// Thingport's featured card frames the model from above and in front.
const VIEW_DIRECTION = new THREE.Vector3(0, 1, 1).normalize();
const KEY_LIGHT_OFFSET = new THREE.Vector3(60, 260, 90).normalize();

interface ModelViewerProps {
  url: string;
  format: ThingportMeshFormat;
  color: string;
  autoRotate: boolean;
  onOpen: () => void;
  onLoaded: () => void;
  onError: () => void;
}

function disposeMaterials(materials: Iterable<THREE.Material>) {
  const textures = new Set<THREE.Texture>();
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) textures.add(value);
    }
    material.dispose();
  }
  for (const texture of textures) {
    const image: unknown = texture.source.data;
    if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) image.close();
    texture.dispose();
  }
}

function disposeObject(object: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      materials.add(material);
    }
  });
  disposeMaterials(materials);
}

async function loadObjectAsync(url: string, format: ThingportMeshFormat, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Thingport model request failed with ${response.status}`);
  const buffer = await response.arrayBuffer();

  if (format === "glb") {
    const manager = new THREE.LoadingManager();
    // The preview is self-contained. Never let a model fetch arbitrary browser URLs.
    manager.setURLModifier((resourceUrl) => {
      signal.throwIfAborted();
      if (resourceUrl.startsWith("blob:") || resourceUrl.startsWith("data:")) return resourceUrl;
      throw new Error("Thingport previews cannot load external resources");
    });
    // The server's preview is already Y-up.
    const gltf = await new GLTFLoader(manager).parseAsync(buffer, "");
    return gltf.scene;
  }

  const mesh = new THREE.Mesh(new STLLoader().parse(buffer));
  // Print files are Z-up; three.js is Y-up.
  mesh.rotateX(-Math.PI / 2);
  return mesh;
}

/** A model spinning slowly in the primary colour; drag to turn it, click to open it. */
export function ThingportModelViewer({ url, format, color, autoRotate, onOpen, onLoaded, onError }: ModelViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  // Read inside the effect without reloading the model when they change.
  const callbacksRef = useRef({ onOpen, onLoaded, onError });
  callbacksRef.current = { onOpen, onLoaded, onError };
  const initialRef = useRef({ color, autoRotate });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const abortController = new AbortController();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (error) {
      // WebGL off (no hardware acceleration) or out of contexts: fall back to the thumbnail, not the error card.
      console.warn("WebGL is unavailable for the Thingport featured model", error);
      callbacksRef.current.onError();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // Keeps saturated colours from clipping to white under the room lighting.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    room.dispose();
    scene.environment = environment.texture;
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    scene.add(keyLight);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10_000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    // The wheel scrolls the board, not the model.
    controls.enableZoom = false;
    controls.autoRotate = initialRef.current.autoRotate;
    controlsRef.current = controls;

    const material = new THREE.MeshStandardMaterial({
      color: initialRef.current.color,
      metalness: 0.2,
      roughness: 0.8,
    });
    materialRef.current = material;

    const pivot = new THREE.Group();
    scene.add(pivot);
    let radius = 0;

    const frame = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = width / height;
      if (radius > 0) {
        // Fits the bounding sphere against both field-of-view axes, so no spin angle crops it.
        const verticalFov = THREE.MathUtils.degToRad(camera.fov);
        const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
        const distance = 1.15 * Math.max(radius / Math.sin(verticalFov / 2), radius / Math.sin(horizontalFov / 2));
        const direction = camera.position.lengthSq() > 0 ? camera.position.clone().normalize() : VIEW_DIRECTION;
        camera.position.copy(direction).multiplyScalar(distance);
        camera.near = Math.max(distance / 1000, 0.01);
        camera.far = distance + radius * 4;
        controls.target.set(0, 0, 0);
      }
      camera.updateProjectionMatrix();
      controls.update();
    };
    const resizeObserver = new ResizeObserver(frame);
    resizeObserver.observe(mount);

    const render = () => {
      controls.update();
      // The light turns with the camera, so the lit side stays facing the viewer while it spins.
      keyLight.position
        .copy(KEY_LIGHT_OFFSET)
        .applyQuaternion(camera.quaternion)
        .multiplyScalar(radius * 3 || 100);
      renderer.render(scene, camera);
    };
    // Only animate while the widget is on screen.
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      renderer.setAnimationLoop(entry?.isIntersecting ? render : null);
    });
    intersectionObserver.observe(mount);

    void loadObjectAsync(url, format, abortController.signal)
      .then((object) => {
        if (abortController.signal.aborted) {
          disposeObject(object);
          return;
        }
        // One material in the primary colour, as Thingport's own featured card draws it.
        const replacedMaterials = new Set<THREE.Material>();
        object.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const previous: THREE.Material | THREE.Material[] = child.material;
          for (const replaced of Array.isArray(previous) ? previous : [previous]) replacedMaterials.add(replaced);
          child.material = material;
        });
        disposeMaterials(replacedMaterials);
        const box = new THREE.Box3().setFromObject(object);
        object.position.sub(box.getCenter(new THREE.Vector3()));
        radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.001);
        pivot.add(object);
        camera.position.copy(VIEW_DIRECTION);
        frame();
        callbacksRef.current.onLoaded();
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) return;
        console.warn("Failed to load the Thingport featured model", error);
        callbacksRef.current.onError();
      });

    let pressedAt: { x: number; y: number } | null = null;
    const handlePointerDown = (event: PointerEvent) => (pressedAt = { x: event.clientX, y: event.clientY });
    const handleClick = (event: MouseEvent) => {
      if (pressedAt && Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y) < CLICK_SLOP_PX) {
        callbacksRef.current.onOpen();
      }
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("click", handleClick);

    return () => {
      abortController.abort();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("click", handleClick);
      controls.dispose();
      pivot.traverse((child) => {
        if (child instanceof THREE.Mesh) child.geometry.dispose();
      });
      material.dispose();
      environment.dispose();
      pmrem.dispose();
      // Frees the GL context now rather than at garbage collection; one is made per model or remount.
      renderer.forceContextLoss();
      renderer.dispose();
      renderer.domElement.remove();
      materialRef.current = null;
      controlsRef.current = null;
    };
  }, [url, format]);

  useEffect(() => {
    materialRef.current?.color.set(color);
  }, [color]);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  return <div ref={mountRef} style={{ position: "absolute", inset: 0, cursor: "grab" }} />;
}
