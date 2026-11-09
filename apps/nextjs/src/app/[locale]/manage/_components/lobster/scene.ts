import * as THREE from "three";

import { createLobsterModel } from "./rig";

export interface LobsterScene {
  spin: (dx: number, dy: number, hold?: boolean) => void;
  release: (velocity: number) => void;
  look: (x: number, y: number) => void;
  setHovered: (hovered: boolean) => void;
  poke: () => void;
  reset: () => void;
  dispose: () => void;
}

interface LobsterSceneOptions {
  color: THREE.ColorRepresentation;
  idleSpin: boolean;
}

const pulse = (started: number, now: number, duration: number) => {
  const progress = (now - started) / duration;
  if (progress < 0 || progress > 1) return 0;
  return Math.sin(progress * Math.PI);
};

export const createLobsterScene = (host: HTMLElement, svg: string, options: LobsterSceneOptions): LobsterScene => {
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

  const { model, rig, material } = createLobsterModel(svg, options.color);
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);
  host.appendChild(renderer.domElement);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const restYaw = -0.28;
  const restPitch = -0.1;
  let visible = true;
  let disposed = false;
  let frame = 0;
  let lastRender = 0;
  let yaw = restYaw;
  let pitch = restPitch;
  let yawVelocity = 0;
  let lookX = 0;
  let lookY = 0;
  let hovered = false;
  let dragging = false;
  let greetingStarted = -1000;
  let winkStarted = -1000;
  let pokeStarted = -1000;
  let nextWink = performance.now() + 6500;

  const draw = (now: number) => {
    frame = 0;
    if (disposed || document.hidden || !visible) return;
    const still = reducedMotion.matches;
    const delta = Math.min((now - lastRender) / 1000, 0.1);
    lastRender = now;

    if (!still) {
      if (!dragging) {
        yaw += yawVelocity * delta;
        yawVelocity *= Math.pow(0.04, delta);
        if (options.idleSpin && !hovered) yaw += delta * 0.28;
        if (!options.idleSpin && !hovered && Math.abs(yawVelocity) < 0.05) {
          yaw += (restYaw + Math.round((yaw - restYaw) / (Math.PI * 2)) * Math.PI * 2 - yaw) * Math.min(delta * 2, 1);
          pitch += (restPitch - pitch) * Math.min(delta * 2, 1);
        }
      }
      if (now > nextWink) {
        winkStarted = now;
        nextWink = now + 8000 + Math.random() * 6000;
      }
    }

    const greeting = still ? 0 : pulse(greetingStarted, now, 700);
    const snap = still ? 0 : pulse(pokeStarted, now, 520);
    const hop = still ? 0 : pulse(pokeStarted, now, 620);
    const wink = still ? 1 : 1 - pulse(winkStarted, now, 420) * 0.94;

    pivot.rotation.set(pitch + lookY * 0.25, yaw + lookX * 0.35, 0);
    pivot.position.y = hop * 0.45 + (still ? 0 : Math.sin(now / 900) * 0.06);
    pivot.scale.setScalar(1 + snap * 0.06);
    const eye = rig.eyes[1];
    if (eye) eye.scale.y = wink;

    const motion = still ? 0 : 0.15;
    const t = now / 1000;
    for (const claw of rig.claws) {
      const offset = claw.side === 1 ? 0.55 : 0;
      const cycle = (1 - Math.cos(t * 1.54 + offset)) / 2;
      const closure = Math.pow(cycle, 1.8) * 0.135 * motion + greeting * 0.025 + snap * 0.18;
      claw.middle.rotation.z = -claw.side * closure * 2.1;
      claw.tip.rotation.z = -claw.side * closure;
      claw.shoulder.rotation.z =
        claw.side * (Math.sin(t * 1.4 + offset) * 0.06 * motion + greeting * 0.04 + snap * 0.12);
    }
    for (const antenna of rig.antennae) {
      const offset = antenna.side === 1 ? 0.55 : 0;
      const strength = 0.14 * motion + snap * 0.12;
      const phase = t * 2.55 + offset;
      antenna.middle.rotation.z = Math.sin(phase) * strength * 0.7;
      antenna.tip.rotation.z = Math.sin(phase - 0.85) * strength * 1.25;
      antenna.middle.rotation.x = Math.sin(phase * 0.72) * strength * 0.2;
      antenna.tip.rotation.x = Math.sin(phase * 0.72 - 0.65) * strength * 0.45;
    }
    renderer.render(scene, camera);
    if (!still) frame = requestAnimationFrame(draw);
  };

  const wake = () => {
    if (disposed || frame || document.hidden || !visible) return;
    lastRender = performance.now();
    frame = requestAnimationFrame(draw);
  };

  const pause = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const onVisibility = () => {
    if (document.hidden) pause();
    else wake();
  };

  const resize = new ResizeObserver(() => {
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    camera.aspect = host.clientWidth / Math.max(host.clientHeight, 1);
    camera.updateProjectionMatrix();
    wake();
  });
  resize.observe(host);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    if (visible) wake();
    else pause();
  });
  intersection.observe(host);
  document.addEventListener("visibilitychange", onVisibility);
  reducedMotion.addEventListener("change", wake);
  wake();

  return {
    spin(dx, dy, hold = true) {
      if (hold) dragging = true;
      yaw += dx;
      pitch = THREE.MathUtils.clamp(pitch + dy, -0.9, 0.9);
      wake();
    },
    release(velocity) {
      dragging = false;
      yawVelocity = THREE.MathUtils.clamp(velocity, -14, 14);
      wake();
    },
    look(x, y) {
      lookX = x;
      lookY = y;
      wake();
    },
    setHovered(value) {
      if (value && !hovered) {
        greetingStarted = performance.now();
        winkStarted = greetingStarted;
        nextWink = greetingStarted + 10000;
      }
      hovered = value;
      if (!value) {
        lookX = 0;
        lookY = 0;
      }
      wake();
    },
    poke() {
      pokeStarted = performance.now();
      yawVelocity += Math.PI * 2.4;
      wake();
    },
    reset() {
      yaw = restYaw;
      pitch = restPitch;
      yawVelocity = 0;
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
        if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
      });
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
};
