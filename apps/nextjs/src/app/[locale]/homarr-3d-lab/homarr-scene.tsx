"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { LabConfig } from "./lab-types";
import { animateWordmarkRig, buildWordmarkRig, defaultWordmarkMotion } from "./wordmark-rig";
import type { WordmarkMotion, WordmarkRig } from "./wordmark-rig";

type SceneMode = "lobster" | "loader" | "wordmark" | "exploded";

interface Props {
  config: LabConfig;
  mode?: SceneMode;
  explosion?: number;
  loaderStyle?: string;
  clackSignal?: number;
  resetSignal?: number;
  wordmarkMotion?: WordmarkMotion;
}

const materialSettings = {
  red: { color: 0xfa5352, metalness: 0.12, roughness: 0.28, clearcoat: 0.7 },
  matte: { color: 0xfa5352, metalness: 0, roughness: 0.82, clearcoat: 0 },
  glossy: { color: 0xfa5352, metalness: 0.05, roughness: 0.1, clearcoat: 1 },
  metal: { color: 0xfa5352, metalness: 0.72, roughness: 0.23, clearcoat: 0.8 },
  chrome: { color: 0xd9dce2, metalness: 1, roughness: 0.12, clearcoat: 1 },
  plastic: { color: 0xfa5352, metalness: 0, roughness: 0.38, clearcoat: 0.45 },
  glass: { color: 0xfa5352, metalness: 0.05, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.54 },
} as const;

type Side = -1 | 1;
type JointKind = "claw" | "antenna";

interface JointChain {
  mesh: THREE.SkinnedMesh;
  shoulder: THREE.Bone;
  middle: THREE.Bone;
  tip: THREE.Bone;
  side: Side;
}

interface LobsterRig {
  claws: JointChain[];
  antennae: JointChain[];
  eyes: THREE.Mesh[];
}

// The original SVG has one path with seven separate silhouettes in this order.
const lobsterParts = [
  "left-antenna",
  "right-antenna",
  "body",
  "left-eye",
  "right-eye",
  "right-claw",
  "left-claw",
] as const;

function smoothstep(start: number, end: number, value: number) {
  const t = THREE.MathUtils.clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}

function makeJointedPart(
  geometry: THREE.ExtrudeGeometry,
  material: THREE.Material,
  center: THREE.Vector3,
  kind: JointKind,
  side: Side,
): JointChain {
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.frustumCulled = false;

  // Coordinates here are from /logo/homarr.svg. The shoulder stays fixed;
  // the other two bones follow the silhouette's center line.
  const joints: [[number, number], [number, number], [number, number]] =
    kind === "claw"
      ? [
          [134, 335],
          [95, 270],
          [65, 180],
        ]
      : [
          [227, 226],
          [185, 165],
          [169, 105],
        ];
  const at = ([x, y]: [number, number]) => new THREE.Vector3((side === -1 ? x : 512 - x) - center.x, y - center.y, 0);
  const [shoulderJoint, middleJoint, tipJoint] = joints;
  const shoulderPosition = at(shoulderJoint);
  const middlePosition = at(middleJoint);
  const tipPosition = at(tipJoint);

  const shoulder = new THREE.Bone();
  shoulder.name = `${kind}-${side}-shoulder`;
  shoulder.position.copy(shoulderPosition);
  const middle = new THREE.Bone();
  middle.name = `${kind}-${side}-middle`;
  middle.position.copy(middlePosition).sub(shoulderPosition);
  const tip = new THREE.Bone();
  tip.name = `${kind}-${side}-tip`;
  tip.position.copy(tipPosition).sub(middlePosition);
  shoulder.add(middle);
  middle.add(tip);
  mesh.add(shoulder);

  const positions = geometry.getAttribute("position");
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];
  const baseY = kind === "claw" ? 370 : 230;
  const topY = kind === "claw" ? 113 : 83;
  for (let index = 0; index < positions.count; index++) {
    const progress = THREE.MathUtils.clamp((baseY - (center.y + positions.getY(index))) / (baseY - topY), 0, 1);
    const middleWeight = smoothstep(0.08, 0.48, progress);
    const tipWeight = smoothstep(0.42, 0.9, progress);
    skinIndices.push(0, 1, 2, 0);
    skinWeights.push(1 - middleWeight, middleWeight * (1 - tipWeight), middleWeight * tipWeight, 0);
  }
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
  mesh.bind(new THREE.Skeleton([shoulder, middle, tip]));

  return { mesh, shoulder, middle, tip, side };
}

function dispose(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
    if (child instanceof THREE.SkinnedMesh) child.skeleton.dispose();
  });
}

function makeMaterial(config: LabConfig) {
  const settings = materialSettings[config.material];
  return new THREE.MeshPhysicalMaterial({
    ...settings,
    wireframe: config.wireframe,
    side: THREE.DoubleSide,
  });
}

function styleForVariant(config: LabConfig) {
  if (config.variant === "chunky") return { depth: config.depth * 1.9, bevel: config.bevel * 1.45, scaleZ: 1 };
  if (config.variant === "rounded")
    return { depth: config.depth * 1.2, bevel: Math.max(0.13, config.bevel * 1.7), scaleZ: 1.22 };
  if (config.variant === "full")
    return { depth: config.depth * 1.7, bevel: Math.max(0.12, config.bevel * 1.5), scaleZ: 1.55 };
  return { depth: config.depth, bevel: config.bevel, scaleZ: 1 };
}

function extrudeSvg(svg: string, config: LabConfig) {
  const parsed = new SVGLoader().parse(svg);
  const model = new THREE.Group();
  model.name = "CenteredLobsterGeometry";
  const rig: LobsterRig = { claws: [], antennae: [], eyes: [] };
  const style = styleForVariant(config);
  let meshIndex = 0;

  parsed.paths.forEach((path) => {
    SVGLoader.createShapes(path).forEach((shape) => {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: style.depth * 54,
        bevelEnabled: true,
        bevelThickness: style.bevel * 20,
        bevelSize: style.bevel * 15,
        bevelSegments: config.variant === "metal" ? 3 : 5,
        curveSegments: config.variant === "full" ? 18 : 12,
      });
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      const partCenter = geometry.boundingBox?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3();
      geometry.translate(-partCenter.x, -partCenter.y, -partCenter.z);
      const part = lobsterParts[meshIndex];
      const side: Side = part?.startsWith("left") ? -1 : 1;
      let mesh: THREE.Mesh;
      if (part?.endsWith("claw") || part?.endsWith("antenna")) {
        const kind = part.endsWith("claw") ? "claw" : "antenna";
        const chain = makeJointedPart(geometry, makeMaterial(config), partCenter, kind, side);
        mesh = chain.mesh;
        rig[kind === "claw" ? "claws" : "antennae"].push(chain);
      } else {
        mesh = new THREE.Mesh(geometry, makeMaterial(config));
        if (part?.endsWith("eye")) rig.eyes.push(mesh);
      }
      mesh.position.copy(partCenter);
      mesh.name = part ?? `badge-layer-${meshIndex}`;
      meshIndex++;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      model.add(mesh);
    });
  });

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.children.forEach((child) => {
    child.position.sub(center);
    child.userData.home = child.position.clone();
  });
  const centeredBox = new THREE.Box3().setFromObject(model);
  const size = centeredBox.getSize(new THREE.Vector3());
  const scale = 5.15 / Math.max(size.x, size.y);
  model.scale.set(scale, -scale, scale * style.scaleZ);
  return { model, rig };
}

export function HomarrScene({
  config,
  mode = "lobster",
  explosion = 0,
  loaderStyle = "spin",
  clackSignal = 0,
  resetSignal = 0,
  wordmarkMotion = defaultWordmarkMotion,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const clackSignalRef = useRef(clackSignal);
  const wordmarkMotionRef = useRef(wordmarkMotion);

  useEffect(() => {
    clackSignalRef.current = clackSignal;
  }, [clackSignal]);

  useEffect(() => {
    wordmarkMotionRef.current = wordmarkMotion;
  }, [wordmarkMotion]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(config.fov, 1, 0.05, 100);
    camera.position.set(0, 0.25, mode === "wordmark" ? 14 : 12);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.minDistance = 7;
    controls.maxDistance = 22;
    let interacting = false;
    let hoveredPart: string | null = null;
    let resumeBlend = 1;
    controls.addEventListener("start", () => {
      interacting = true;
      hoveredPart = null;
      renderer.domElement.style.cursor = "grabbing";
      resumeBlend = 0;
    });
    controls.addEventListener("end", () => {
      interacting = false;
      renderer.domElement.style.cursor = "grab";
    });

    const root = new THREE.Group();
    root.name = "AnimationRootAtCalculatedCenter";
    scene.add(root);
    const key = new THREE.DirectionalLight(0xffe4df, config.keyLight);
    key.position.set(-4, 6, 8);
    key.castShadow = true;
    const fill = new THREE.DirectionalLight(0x8aa5ff, config.fillLight);
    fill.position.set(6, 1, 5);
    const rim = new THREE.DirectionalLight(0xff5c66, config.rimLight);
    rim.position.set(2, 5, -6);
    scene.add(key, fill, rim, new THREE.HemisphereLight(0xffffff, 0x191a20, 1.7));

    if (config.ground) {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.32 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -3.6;
      floor.receiveShadow = true;
      scene.add(floor);
    }

    let model: THREE.Group | undefined;
    let rig: LobsterRig | undefined;
    let wordmarkRig: WordmarkRig | undefined;
    let animationFrame = 0;
    let alive = true;
    let lastClackSignal = clackSignalRef.current;
    let onceStart = -10;
    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const setHoveredPart = (name: string | null) => {
      if (hoveredPart === name) return;
      hoveredPart = name;
      let cursor = "grab";
      if (interacting) cursor = "grabbing";
      else if (name) cursor = "pointer";
      renderer.domElement.style.cursor = cursor;
      if (mode === "wordmark") {
        const label = name
          ? `Interactive 3D wordmark; selected ${name.replaceAll("-", " ")}`
          : "Interactive 3D wordmark";
        host.setAttribute("aria-label", `${label}. Hover parts or use arrow keys to select them.`);
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!wordmarkRig || interacting) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(wordmarkRig.hoverMeshes, false)[0];
      setHoveredPart(hit?.object.parent?.name ?? null);
    };
    const onPointerLeave = () => setHoveredPart(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!wordmarkRig) return;
      if (event.key === "Escape") return setHoveredPart(null);
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const index = wordmarkRig.hoverParts.findIndex((part) => part.name === hoveredPart);
      const step = event.key === "ArrowRight" ? 1 : -1;
      const next = (index + step + wordmarkRig.hoverParts.length) % wordmarkRig.hoverParts.length;
      const nextPart = wordmarkRig.hoverParts[next];
      if (nextPart) setHoveredPart(nextPart.name);
    };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    host.addEventListener("keydown", onKeyDown);

    const source = mode === "wordmark" ? "/logo/homarr-wordmark-rig.svg" : "/logo/homarr.svg";
    fetch(source)
      .then((response) => response.text())
      .then((svg) => {
        if (!alive) return;
        if (mode === "wordmark") {
          wordmarkRig = buildWordmarkRig(svg, config);
          model = wordmarkRig.model;
        } else {
          const built = extrudeSvg(svg, config);
          model = built.model;
          rig = built.rig;
        }
        root.add(model);
        if (config.axes) root.add(new THREE.AxesHelper(4));
        if (config.bounds) root.add(new THREE.BoxHelper(model, 0xffffff));
        if (config.pivots && rig) {
          for (const chain of [...rig.claws, ...rig.antennae]) {
            for (const [index, bone] of [chain.shoulder, chain.middle, chain.tip].entries()) {
              const marker = new THREE.Mesh(
                new THREE.SphereGeometry(4.5),
                new THREE.MeshBasicMaterial({ color: index === 0 ? 0x65e7ff : 0xffd166 }),
              );
              marker.position.z = 18;
              bone.add(marker);
            }
          }
        }
      });

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      // Keep the canvas layout size in CSS pixels while Three.js scales the
      // drawing buffer for the device pixel ratio. Without this, Retina
      // displays lay the canvas out at its DPR-scaled intrinsic dimensions.
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      if (clackSignalRef.current !== lastClackSignal) {
        lastClackSignal = clackSignalRef.current;
        onceStart = t;
      }
      controls.update();
      if (!model) return renderer.render(scene, camera);
      if (!config.paused) {
        resumeBlend = interacting ? 0 : Math.min(1, resumeBlend + delta * 0.7);
        if (config.autoRotate) {
          const amount = delta * config.rotationSpeed * resumeBlend;
          if (config.rotationAxis === "x") root.rotation.x += amount;
          else if (config.rotationAxis === "z") root.rotation.z += amount;
          else if (config.rotationAxis === "free") {
            root.rotation.y += amount;
            root.rotation.x += amount * 0.34;
          } else root.rotation.y += amount;
        }
        root.position.y = config.idleFloat ? Math.sin(t * config.idleSpeed) * config.idleStrength : 0;
        const bodyScale = config.bodyPulse || config.idleBody ? 1 + Math.sin(t * config.idleSpeed * 1.4) * 0.012 : 1;
        root.scale.setScalar(bodyScale);
        if (rig) {
          for (const chain of rig.claws) {
            let phase = 0;
            if (chain.side === 1 && config.clawMode === "alternating") phase = Math.PI;
            if (chain.side === 1 && config.clawMode === "offset") phase = 0.55;
            const cycle = (1 - Math.cos(t * config.clawSpeed * config.clawFrequency * 2.2 + phase)) / 2;
            const onceAge = t - onceStart;
            const clack = onceAge >= 0 && onceAge < 1.1 ? Math.sin((onceAge / 1.1) * Math.PI) ** 2 : 0;
            const enabled = config.claws && (chain.side === -1 ? config.leftClaw : config.rightClaw);
            const closure = enabled ? Math.min(1, Math.pow(cycle, 1.8) + clack) * config.clawStrength : 0;
            // The fixed shoulder holds the attachment while the palm and tip
            // curl toward the opposite claw.
            chain.middle.rotation.z = -chain.side * closure * 2.1;
            chain.tip.rotation.z = -chain.side * closure;
          }

          for (const chain of rig.antennae) {
            const enabled = config.antennae && (chain.side === -1 ? config.leftAntenna : config.rightAntenna);
            const strength = enabled ? config.antennaStrength : 0;
            const phase = t * config.antennaSpeed * 3.4 + (chain.side === 1 ? 0.55 : 0);
            chain.middle.rotation.z = Math.sin(phase) * strength * 0.7;
            chain.tip.rotation.z = Math.sin(phase - 0.85) * strength * 1.25;
            chain.middle.rotation.x = config.secondaryMotion ? Math.sin(phase * 0.72) * strength * 0.2 : 0;
            chain.tip.rotation.x = config.secondaryMotion ? Math.sin(phase * 0.72 - 0.65) * strength * 0.45 : 0;
          }

          if (config.eyes) {
            rig.eyes.forEach((eye, index) => {
              eye.scale.y = 1 + Math.sin(t * 2.4 + index * 0.8) * 0.06;
            });
          }
        }
        model.children.forEach((child, index) => {
          if (mode === "exploded") {
            const home = child.userData.home as THREE.Vector3;
            const direction = home
              .clone()
              .setZ(index % 2 ? 0.45 : -0.45)
              .normalize();
            const target = home.clone().add(direction.multiplyScalar(explosion * (85 + (index % 3) * 18)));
            child.position.lerp(target, 0.08);
          }
        });
        if (wordmarkRig) {
          animateWordmarkRig(wordmarkRig, t, delta, wordmarkMotionRef.current, hoveredPart);
        }
        if (mode === "loader") {
          if (loaderStyle === "tumble") {
            root.rotation.x += delta * 0.65;
            root.rotation.y += delta * 0.9;
          }
          if (loaderStyle === "flip") root.rotation.x += delta * 1.4;
          if (loaderStyle === "spring") root.rotation.y = Math.sin(t * 1.8) * 0.9;
          if (loaderStyle === "pulse") root.scale.setScalar(0.92 + Math.sin(t * 3) * 0.08);
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      alive = false;
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
      controls.dispose();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      host.removeEventListener("keydown", onKeyDown);
      dispose(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [config, mode, explosion, loaderStyle, resetSignal]);

  return (
    <div
      ref={hostRef}
      className="homarr-canvas"
      aria-label={`Interactive ${mode} 3D scene`}
      role={mode === "wordmark" ? "application" : undefined}
      tabIndex={mode === "wordmark" ? 0 : undefined}
    />
  );
}
