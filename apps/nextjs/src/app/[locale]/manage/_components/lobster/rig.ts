import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

type Side = -1 | 1;
type JointKind = "claw" | "antenna";

export interface JointChain {
  mesh: THREE.SkinnedMesh;
  shoulder: THREE.Bone;
  middle: THREE.Bone;
  tip: THREE.Bone;
  side: Side;
}

export interface LobsterRig {
  claws: JointChain[];
  antennae: JointChain[];
  eyes: THREE.Mesh[];
}

const lobsterParts = [
  "left-antenna",
  "right-antenna",
  "body",
  "left-eye",
  "right-eye",
  "right-claw",
  "left-claw",
] as const;

const smoothstep = (start: number, end: number, value: number) => {
  const t = THREE.MathUtils.clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
};

const makeJointedPart = (
  geometry: THREE.ExtrudeGeometry,
  material: THREE.Material,
  center: THREE.Vector3,
  kind: JointKind,
  side: Side,
): JointChain => {
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.frustumCulled = false;

  const joints: [number, number][] =
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
  const [shoulderPosition, middlePosition, tipPosition] = joints.map(at) as [
    THREE.Vector3,
    THREE.Vector3,
    THREE.Vector3,
  ];

  const shoulder = new THREE.Bone();
  shoulder.position.copy(shoulderPosition);
  const middle = new THREE.Bone();
  middle.position.copy(middlePosition).sub(shoulderPosition);
  const tip = new THREE.Bone();
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
};

export const createLobsterModel = (svg: string, color: THREE.ColorRepresentation) => {
  const parsed = new SVGLoader().parse(svg);
  const model = new THREE.Group();
  const rig: LobsterRig = { claws: [], antennae: [], eyes: [] };
  const material = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.12,
    roughness: 0.28,
    clearcoat: 0.7,
    side: THREE.DoubleSide,
  });
  let meshIndex = 0;

  for (const path of parsed.paths) {
    for (const shape of SVGLoader.createShapes(path)) {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.48 * 54,
        bevelEnabled: true,
        bevelThickness: 0.08 * 20,
        bevelSize: 0.08 * 15,
        bevelSegments: 5,
        curveSegments: 12,
      });
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      const partCenter = geometry.boundingBox?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3();
      geometry.translate(-partCenter.x, -partCenter.y, -partCenter.z);
      const part = lobsterParts[meshIndex];
      const side: Side = part?.startsWith("left") ? -1 : 1;
      let mesh: THREE.Mesh;
      if (part?.endsWith("claw") || part?.endsWith("antenna")) {
        const kind: JointKind = part.endsWith("claw") ? "claw" : "antenna";
        const chain = makeJointedPart(geometry, material, partCenter, kind, side);
        mesh = chain.mesh;
        rig[kind === "claw" ? "claws" : "antennae"].push(chain);
      } else {
        mesh = new THREE.Mesh(geometry, material);
        if (part?.endsWith("eye")) rig.eyes.push(mesh);
      }
      mesh.position.copy(partCenter);
      meshIndex++;
      model.add(mesh);
    }
  }

  const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
  model.children.forEach((child) => child.position.sub(center));
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  const scale = 5.15 / Math.max(size.x, size.y);
  model.scale.set(scale, -scale, scale);

  return { model, rig, material };
};
