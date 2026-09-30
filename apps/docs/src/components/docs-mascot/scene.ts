import * as THREE from "three";

import { initialConfig } from "../../../../../tools/motion-reel/three/lab-types";
import { extrudeSvg } from "../../../../../tools/motion-reel/three/logo-rig";

export interface MascotScene {
  rotate: (x: number, y: number) => void;
  wink: () => void;
  setHovered: (hovered: boolean) => void;
  reset: () => void;
  dispose: () => void;
}

export function createMascotScene(host: HTMLElement, svg: string): MascotScene {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 12);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x57343e, 2.4));
  const key = new THREE.DirectionalLight(0xfff1e7, 4);
  key.position.set(-3, 5, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb3caff, 3);
  rim.position.set(4, 1, -3);
  scene.add(rim);
  const { model, rig } = extrudeSvg(svg, initialConfig);
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);
  host.appendChild(renderer.domElement);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let visible = true;
  let disposed = false;
  let frame = 0;
  let lastRender = 0;
  let yaw = -0.28;
  let pitch = -0.1;
  let hovered = false;
  let greetingStarted = -1000;
  let winkStarted = -1000;
  let nextWink = performance.now() + 6500;

  function draw(now: number) {
    frame = 0;
    if (disposed || document.hidden || !visible) return;
    if (now - lastRender >= 32 || reducedMotion.matches) {
      const delta = Math.min((now - lastRender) / 1000, 0.1);
      lastRender = now;
      let wink = 1;
      if (!reducedMotion.matches) {
        if (!hovered) yaw += delta * 0.28;
        if (now > nextWink) {
          winkStarted = now;
          nextWink = now + 8000 + Math.random() * 6000;
        }
        const progress = (now - winkStarted) / 420;
        if (progress >= 0 && progress <= 1) wink = 1 - Math.sin(progress * Math.PI) * 0.94;
      }
      pivot.rotation.set(pitch, yaw, 0);
      const eye = rig.eyes[1];
      if (eye) eye.scale.y = wink;
      // Reuse the closing-claw and 3D antenna motion from the reel's poseLobster loop.
      let motionStrength = 0.15;
      const greetingProgress = (now - greetingStarted) / 700;
      let greeting = 0;
      if (greetingProgress >= 0 && greetingProgress <= 1) greeting = Math.sin(greetingProgress * Math.PI);
      motionStrength += greeting * 0.2;
      if (reducedMotion.matches) motionStrength = 0;
      const t = now / 1000;
      for (const claw of rig.claws) {
        let offset = 0;
        if (claw.side === 1) offset = 0.55;
        const cycle = (1 - Math.cos(t * initialConfig.clawSpeed * initialConfig.clawFrequency * 2.2 + offset)) / 2;
        const closure = Math.pow(cycle, 1.8) * 0.6 * initialConfig.clawStrength * 1.25 * motionStrength;
        claw.middle.rotation.z = -claw.side * closure * 2.1;
        claw.tip.rotation.z = -claw.side * closure;
        claw.shoulder.rotation.z = Math.sin(t * 1.4 + offset) * claw.side * 0.06 * motionStrength;
      }
      for (const antenna of rig.antennae) {
        let offset = 0;
        if (antenna.side === 1) offset = 0.55;
        const strength = initialConfig.antennaStrength * 1.4 * motionStrength;
        const phase = t * initialConfig.antennaSpeed * 3.4 + offset;
        antenna.middle.rotation.z = Math.sin(phase) * strength * 0.7;
        antenna.tip.rotation.z = Math.sin(phase - 0.85) * strength * 1.25;
        antenna.middle.rotation.x = Math.sin(phase * 0.72) * strength * 0.2;
        antenna.tip.rotation.x = Math.sin(phase * 0.72 - 0.65) * strength * 0.45;
      }
      renderer.render(scene, camera);
    }
    if (!reducedMotion.matches) frame = requestAnimationFrame(draw);
  }

  function wake() {
    if (disposed || frame || document.hidden || !visible) return;
    lastRender = 0;
    frame = requestAnimationFrame(draw);
  }

  function pause() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function onVisibility() {
    if (document.hidden) pause();
    else wake();
  }

  const resize = new ResizeObserver(() => {
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    camera.aspect = host.clientWidth / Math.max(host.clientHeight, 1);
    camera.updateProjectionMatrix();
    wake();
  });
  resize.observe(host);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
    else pause();
  });
  intersection.observe(host);
  document.addEventListener("visibilitychange", onVisibility);
  reducedMotion.addEventListener("change", wake);
  wake();

  return {
    rotate(x, y) {
      yaw += x;
      pitch += y;
      wake();
    },
    setHovered(value) {
      if (value && !hovered && !reducedMotion.matches) {
        greetingStarted = performance.now();
        winkStarted = greetingStarted;
        nextWink = greetingStarted + 10000;
      }
      hovered = value;
      wake();
    },
    wink() {
      if (reducedMotion.matches) return;
      winkStarted = performance.now();
      wake();
    },
    reset() {
      yaw = -0.28;
      pitch = -0.1;
      wake();
    },
    dispose() {
      disposed = true;
      pause();
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener("change", wake);
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = [object.material].flat();
        for (const material of materials) material.dispose();
        if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
