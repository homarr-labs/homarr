import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { LabConfig } from "./lab-types";

export interface WordmarkRig {
  model: THREE.Group;
  baseScale: number;
  frame: THREE.Group;
  spine: THREE.Group;
  cursor: THREE.Group;
  clickRays: THREE.Group;
  panels: THREE.Group[];
  letters: THREE.Group[];
  kana: THREE.Group[];
  arrowHead: THREE.Group;
  arrowSegments: THREE.Group[];
  arrowTip: THREE.Group;
  breathingOrder: THREE.Group[];
  hoverParts: THREE.Group[];
  hoverMeshes: THREE.Mesh[];
  beamParts: THREE.Group[];
  beamAnchors: number[];
  beamPath: THREE.CatmullRomCurve3;
  beamDots: THREE.Mesh[];
}

export interface WordmarkMotion {
  cursor: boolean;
  arrow: boolean;
  panels: boolean;
  letters: boolean;
  kana: boolean;
  beam: boolean;
  breathe: boolean;
}

export const defaultWordmarkMotion: WordmarkMotion = {
  cursor: true,
  arrow: true,
  panels: true,
  letters: true,
  kana: true,
  beam: true,
  breathe: true,
};

function home(part: THREE.Group) {
  return part.userData.home as THREE.Vector3;
}

const beamColor = new THREE.Color(0xffe9c4);
const hoverColor = new THREE.Color(0xffc1c1);

function tintPart(part: THREE.Group, color: THREE.Color, amount: number) {
  for (const child of part.children) {
    if (!(child instanceof THREE.Mesh)) continue;
    const face = Array.isArray(child.material) ? child.material[0] : child.material;
    if (!(face instanceof THREE.MeshBasicMaterial)) continue;
    face.color.copy(child.userData.baseFaceColor as THREE.Color).lerp(color, amount);
  }
}

export function buildWordmarkRig(svg: string, config: LabConfig): WordmarkRig {
  const paths = new SVGLoader().parse(svg).paths;
  const model = new THREE.Group();
  model.name = "IllustratedWordmarkRig";
  const reverseArtwork = new THREE.Group();
  reverseArtwork.name = "StaticReverseArtwork";
  const parts = new Map<string, THREE.Group>();
  const plateDepth = config.depth * 60;

  paths.forEach((path, pathIndex) => {
    const node = path.userData?.node as Element | undefined;
    const parent = node?.parentNode as Element | null | undefined;
    const partName = parent?.getAttribute("data-rig-part");
    if (!partName) throw new Error(`Wordmark contour ${pathIndex} has no rig part`);

    let part = parts.get(partName);
    if (!part) {
      part = new THREE.Group();
      part.name = partName;
      parts.set(partName, part);
    }

    let depth = 2.2;
    let back = 4 + pathIndex * 0.025;
    if (pathIndex === 0) {
      depth = plateDepth;
      back = -plateDepth;
    } else if (pathIndex === 1) {
      depth = 2.4;
      back = 0.25;
    } else if (partName === "arrow-spine") {
      depth = 2;
      back = 2.8 + pathIndex * 0.025;
    } else if (partName === "cursor" || partName === "click-rays") {
      depth = 3;
      back = 7 + pathIndex * 0.025;
    }

    const face = new THREE.MeshBasicMaterial({
      color: path.color,
      side: THREE.DoubleSide,
      wireframe: config.wireframe,
      toneMapped: false,
    });
    const edgeColor = pathIndex === 0 ? new THREE.Color(0xf93232) : path.color.clone().multiplyScalar(0.58);
    const edge = new THREE.MeshStandardMaterial({
      color: edgeColor,
      metalness: 0.1,
      roughness: 0.58,
      side: THREE.DoubleSide,
      wireframe: config.wireframe,
    });

    for (const shape of SVGLoader.createShapes(path)) {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: pathIndex === 0,
        bevelThickness: config.bevel * 8,
        bevelSize: config.bevel * 6,
        bevelSegments: 2,
        curveSegments: 10,
      });
      geometry.computeBoundingBox();
      const center = geometry.boundingBox?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3();
      geometry.translate(-center.x, -center.y, -center.z);
      const mesh = new THREE.Mesh(geometry, [face, edge]);
      mesh.name = `${partName}-${pathIndex}`;
      mesh.position.set(center.x, center.y, center.z + back);
      mesh.renderOrder = pathIndex;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.baseFaceColor = path.color.clone();
      part.add(mesh);

      if (pathIndex > 0) {
        // The reverse is painted too, so the lockup remains readable from
        // behind instead of becoming an unmarked white silhouette.
        const reverseGeometry = new THREE.ShapeGeometry(shape, 10);
        reverseGeometry.translate(-center.x, -center.y, 0);
        const reverse = new THREE.Mesh(reverseGeometry, face.clone());
        reverse.name = `${partName}-${pathIndex}-reverse`;
        reverse.position.set(center.x, center.y, -plateDepth - 0.5 - pathIndex * 0.025);
        reverse.renderOrder = pathIndex;
        // The rear print belongs to the plaque, not the articulated foreground.
        // Moving it with a letter would bury it inside the backing from behind.
        reverseArtwork.add(reverse);
      }
    }
  });

  for (const part of parts.values()) {
    const bounds = new THREE.Box3().setFromObject(part);
    const origin = bounds.getCenter(new THREE.Vector3());
    if (part.name === "cursor" || part.name === "click-rays") origin.set(1229, 287, origin.z);
    for (const child of part.children) child.position.sub(origin);
    part.position.copy(origin);
    model.add(part);
  }
  model.add(reverseArtwork);

  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  for (const part of parts.values()) {
    part.position.sub(center);
    part.userData.home = part.position.clone();
  }
  reverseArtwork.position.sub(center);
  const scale = 8.5 / Math.max(size.x, size.y);
  model.scale.set(scale, -scale, scale);

  const getPart = (name: string) => {
    const part = parts.get(name);
    if (!part) throw new Error(`Missing wordmark rig part: ${name}`);
    return part;
  };

  const frame = getPart("frame");
  const spine = getPart("arrow-spine");
  const cursor = getPart("cursor");
  const clickRays = getPart("click-rays");
  const panels = ["panel-left", "panel-center", "panel-right"].map(getPart);
  const letters = ["letter-h", "letter-o", "letter-m", "letter-a", "letter-r-one", "letter-r-two"].map(getPart);
  const kana = ["kana-ho", "kana-ma", "kana-dash", "kana-ru"].map(getPart);
  const arrowHead = getPart("arrow-head");
  const arrowSegments = [
    "arrow-segment-one",
    "arrow-segment-two",
    "arrow-segment-three",
    "arrow-segment-four",
    "arrow-segment-five",
  ].map(getPart);
  const arrowTip = getPart("arrow-tip");
  const chain = [arrowTip, ...arrowSegments.toReversed(), arrowHead];
  const beamPoints = chain.map((part) => new THREE.Vector3(home(part).x, home(part).y, home(part).z + 17));
  const beamPath = new THREE.CatmullRomCurve3(beamPoints);
  let previous = beamPoints[0];
  if (!previous) throw new Error("Wordmark chain has no parts");
  let beamLength = 0;
  const beamDistances = [0];
  for (const point of beamPoints.slice(1)) {
    beamLength += point.distanceTo(previous);
    beamDistances.push(beamLength);
    previous = point;
  }
  if (beamLength === 0) throw new Error("Wordmark chain has no length");
  const beamAnchors = beamDistances.map((distance) => distance / beamLength);
  const beamDots = [
    { radius: 10, opacity: 0.95 },
    { radius: 22, opacity: 0.22 },
    { radius: 7, opacity: 0.48 },
    { radius: 5, opacity: 0.28 },
  ].map(({ radius, opacity }) => {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 12, 8),
      new THREE.MeshBasicMaterial({
        color: 0xffe7b5,
        transparent: true,
        opacity,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    dot.visible = false;
    model.add(dot);
    return dot;
  });
  const breathingOrder = [frame, ...panels, cursor, clickRays, ...letters, ...kana, spine, ...chain];
  const hoverParts = [...panels, ...letters, ...kana, cursor, clickRays, ...chain];
  const hoverMeshes = hoverParts.flatMap((part) =>
    part.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh),
  );

  return {
    model,
    baseScale: scale,
    frame,
    spine,
    cursor,
    clickRays,
    panels,
    letters,
    kana,
    arrowHead,
    arrowSegments,
    arrowTip,
    breathingOrder,
    hoverParts,
    hoverMeshes,
    beamParts: chain,
    beamAnchors,
    beamPath,
    beamDots,
  };
}

export function animateWordmarkRig(
  rig: WordmarkRig,
  time: number,
  delta: number,
  motion: WordmarkMotion,
  hoveredPart: string | null,
) {
  const breathPeriod = rig.breathingOrder.length * 0.23 + 1.3;
  const breath = (index: number) => {
    if (!motion.breathe) return 0;
    const phase = (((time - index * 0.23) % breathPeriod) + breathPeriod) % breathPeriod;
    const distance = (phase - 0.24) / 0.3;
    return Math.exp(-(distance * distance));
  };
  rig.breathingOrder.forEach((part, index) => {
    part.position.copy(home(part));
    part.rotation.set(0, 0, 0);
    part.scale.setScalar(1);
    if (part === rig.frame) return;
    const pulse = breath(index);
    part.position.z += pulse * 9;
    part.scale.setScalar(1 + pulse * 0.05);
  });
  const plaqueScale = rig.baseScale * (1 + breath(0) * 0.006);
  rig.model.scale.set(plaqueScale, -plaqueScale, plaqueScale);

  const blend = 1 - Math.exp(-delta * 14);
  const hover = (part: THREE.Group, target: number) => {
    const current = (part.userData.hoverLevel as number | undefined) ?? 0;
    const next = current + (target - current) * blend;
    part.userData.hoverLevel = next;
    return next;
  };

  const activePanel = rig.panels.findIndex((part) => part.name === hoveredPart);
  rig.panels.forEach((part, index) => {
    let target = 0;
    if (motion.panels && activePanel >= 0) target = index === activePanel ? 1 : 0.12;
    const level = hover(part, target);
    part.position.y -= level * (12 + Math.sin(time * 7 + index) * 2);
    part.position.z += level * 46;
    part.rotation.y = level * (Math.sin(time * 7 + index) * 0.08);
    part.scale.multiplyScalar(1 + level * 0.13);
    tintPart(part, hoverColor, level * 0.42);
  });

  const activeLetter = rig.letters.findIndex((part) => part.name === hoveredPart);
  rig.letters.forEach((part, index) => {
    let target = 0;
    if (motion.letters && activeLetter >= 0) {
      if (index === activeLetter) target = 1;
      else if (Math.abs(index - activeLetter) === 1) target = 0.18;
    }
    const level = hover(part, target);
    part.position.y -= level * 12;
    part.position.z += level * 55;
    part.rotation.y = Math.sin(time * 6 + index) * level * 0.05;
    part.scale.multiplyScalar(1 + level * 0.14);
    tintPart(part, hoverColor, level * 0.38);
  });

  const activeKana = rig.kana.findIndex((part) => part.name === hoveredPart);
  rig.kana.forEach((part, index) => {
    let target = 0;
    if (motion.kana && activeKana >= 0) {
      if (index === activeKana) target = 1;
      else if (Math.abs(index - activeKana) === 1) target = 0.18;
    }
    const level = hover(part, target);
    part.position.y -= level * 10;
    part.position.z += level * 50;
    part.rotation.z = Math.sin(time * 7 + index) * level * 0.035;
    part.scale.multiplyScalar(1 + level * 0.16);
    tintPart(part, hoverColor, level * 0.42);
  });

  const cursorHover = hover(rig.cursor, motion.cursor && hoveredPart === rig.cursor.name ? 1 : 0);
  const raysHover = hover(rig.clickRays, motion.cursor && hoveredPart === rig.clickRays.name ? 1 : 0);
  const click = motion.cursor ? ((1 + Math.cos(time * 3)) / 2) ** 10 : 0;
  rig.cursor.position.y += click * 13 - cursorHover * 8;
  rig.cursor.position.z += click * 18 + cursorHover * 30;
  rig.cursor.scale.multiplyScalar(1 - click * 0.12 + cursorHover * 0.14);
  rig.clickRays.position.z += click * 18 + raysHover * 26;
  rig.clickRays.scale.multiplyScalar(1 + click * 0.28 + raysHover * 0.24);

  rig.arrowSegments.forEach((part, index) => {
    if (motion.arrow) {
      const wave = Math.sin(time * 1.35 - index * 0.48);
      part.position.y += wave * 8;
      part.position.z += Math.max(0, wave) * 12;
      part.rotation.z = wave * 0.02;
    }
  });
  if (motion.arrow) {
    rig.arrowHead.rotation.z = Math.sin(time * 1.35 + 0.4) * 0.018;
    rig.arrowTip.rotation.z = Math.sin(time * 1.35 - 2.9) * 0.018;
  }

  const beamProgress = (time % 5.2) / 4.2;
  const beamActive = motion.beam && beamProgress <= 1;
  rig.beamDots.forEach((dot, index) => {
    const trail = index < 2 ? 0 : (index - 1) * 0.035;
    dot.visible = beamActive && beamProgress >= trail;
    if (dot.visible) rig.beamPath.getPointAt(beamProgress - trail, dot.position);
  });
  rig.beamParts.forEach((part, index) => {
    const center = rig.beamAnchors[index];
    if (center === undefined) return;
    const distance = (beamProgress - center) / 0.1;
    const light = beamActive ? Math.exp(-(distance * distance)) : 0;
    const level = hover(part, motion.arrow && hoveredPart === part.name ? 1 : 0);
    part.position.z += light * 9 + level * 24;
    part.scale.multiplyScalar(1 + light * 0.055 + level * 0.06);
    tintPart(part, beamColor, Math.min(1, light * 0.7 + level * 0.36));
  });
}
