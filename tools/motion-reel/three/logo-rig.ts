// Extracted verbatim from origin/feat/3d-logo-lab (homarr-3d-lab/homarr-scene.tsx):
// the lobster extrusion + skinned claw/antenna rig, minus the React/OrbitControls shell.
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { LabConfig } from "./lab-types";
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

export { extrudeSvg, makeMaterial };
export type { LobsterRig };
