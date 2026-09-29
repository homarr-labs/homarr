// Deterministic Homarr lobster rig, adapted from the feat/3d-logo-lab branch.
// Every pose is derived from the state passed to render(), never from a clock.
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { initialConfig } from "./lab-types";
import { animateWordmarkRig, buildWordmarkRig, defaultWordmarkMotion, type WordmarkRig } from "./wordmark-rig";

type Side = -1 | 1;
type JointKind = "claw" | "antenna";

interface JointChain {
  mesh: THREE.SkinnedMesh;
  shoulder: THREE.Bone;
  middle: THREE.Bone;
  tip: THREE.Bone;
  side: Side;
}

const lobsterParts = ["left-antenna", "right-antenna", "body", "left-eye", "right-eye", "right-claw", "left-claw"] as const;

function smoothstep(a: number, b: number, v: number) {
  const t = THREE.MathUtils.clamp((v - a) / (b - a), 0, 1);
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
  const [a, b, c] = joints.map(at) as [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  const shoulder = new THREE.Bone();
  shoulder.position.copy(a);
  const middle = new THREE.Bone();
  middle.position.copy(b).sub(a);
  const tip = new THREE.Bone();
  tip.position.copy(c).sub(b);
  shoulder.add(middle);
  middle.add(tip);
  mesh.add(shoulder);

  const positions = geometry.getAttribute("position");
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];
  const baseY = kind === "claw" ? 370 : 230;
  const topY = kind === "claw" ? 113 : 83;
  for (let i = 0; i < positions.count; i++) {
    const p = THREE.MathUtils.clamp((baseY - (center.y + positions.getY(i))) / (baseY - topY), 0, 1);
    const mw = smoothstep(0.08, 0.48, p);
    const tw = smoothstep(0.42, 0.9, p);
    skinIndices.push(0, 1, 2, 0);
    skinWeights.push(1 - mw, mw * (1 - tw), mw * tw, 0);
  }
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
  mesh.bind(new THREE.Skeleton([shoulder, middle, tip]));
  return { mesh, shoulder, middle, tip, side };
}

export interface LogoState {
  visible: boolean;
  x: number; // world units
  y: number;
  z: number;
  scale: number;
  rx: number; // radians
  ry: number;
  rz: number;
  clawL: number; // 0 open → 1 closed
  clawR: number;
  antenna: number; // phase in radians
  antennaAmp: number;
  antennaLift: number; // radians, positive perks both antennae upright
  waveL: number; // radians around the claw's shoulder, positive raises it outward
  waveR: number;
  blinkL: number; // 0 open → 1 shut
  blinkR: number;
  explode: number; // 0 → parts fly apart
  camZ: number;
  sparks: number; // 0..1 burst progress, <0 disabled
  dust: number; // opacity of dust field
  t: number;
  /** Extruded wordmark plaque, posed independently of the lobster (world units, radians). */
  wm: { on: boolean; x: number; y: number; scale: number; rx: number; ry: number };
}

export const defaultLogoState = (): LogoState => ({
  visible: false,
  x: 0,
  y: 0,
  z: 0,
  scale: 1,
  rx: 0,
  ry: 0,
  rz: 0,
  clawL: 0,
  clawR: 0,
  antenna: 0,
  antennaAmp: 0.1,
  antennaLift: 0,
  waveL: 0,
  waveR: 0,
  blinkL: 0,
  blinkR: 0,
  explode: 0,
  camZ: 12,
  sparks: -1,
  dust: 0,
  t: 0,
  wm: { on: false, x: 0, y: 0, scale: 1, rx: 0, ry: 0 },
});

export class LogoGL {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 200);
  root = new THREE.Group();
  model = new THREE.Group();
  claws: JointChain[] = [];
  antennae: JointChain[] = [];
  parts: THREE.Mesh[] = [];
  eyes: { mesh: THREE.Mesh; side: Side }[] = [];
  sparks: THREE.Points;
  sparkSeeds: Float32Array;
  dust: THREE.Points;
  wordmark: WordmarkRig;
  wmRoot = new THREE.Group();

  constructor(canvas: HTMLCanvasElement, svg: string, wordmarkSvg: string) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(1920, 1080, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.setClearColor(0x000000, 0);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;

    const key = new THREE.DirectionalLight(0xfff0ea, 2.4);
    key.position.set(-5, 7, 6);
    const fill = new THREE.DirectionalLight(0x6f8cff, 0.9);
    fill.position.set(7, -1, 4);
    const rim = new THREE.DirectionalLight(0xffc2ba, 3.4);
    rim.position.set(3, 4, -7);
    const rim2 = new THREE.DirectionalLight(0xff4a5a, 4);
    rim2.position.set(-6, -2, -5);
    this.scene.add(key, fill, rim, rim2, new THREE.HemisphereLight(0xffd8d4, 0x0b0b12, 0.25));
    this.scene.add(this.root);
    this.root.add(this.model);
    this.build(svg);
    this.wordmark = buildWordmarkRig(wordmarkSvg, initialConfig);
    this.wmRoot.add(this.wordmark.model);
    this.scene.add(this.wmRoot);

    // Spark burst: 600 points on deterministic trajectories.
    const n = 600;
    this.sparkSeeds = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const r = (k: number) => {
        const x = Math.sin((i * 4 + k) * 91.345 + 17.1) * 43758.5453;
        return x - Math.floor(x);
      };
      this.sparkSeeds.set([r(0), r(1), r(2), r(3)], i * 4);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.sparks = new THREE.Points(
      sg,
      new THREE.PointsMaterial({
        color: 0xff7a70,
        size: 0.1,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.scene.add(this.sparks);

    const dn = 1400;
    const dg = new THREE.BufferGeometry();
    const dp = new Float32Array(dn * 3);
    for (let i = 0; i < dn; i++) {
      const r = (k: number) => {
        const x = Math.sin((i * 3 + k) * 12.9898 + 78.233) * 43758.5453;
        return x - Math.floor(x);
      };
      dp.set([(r(0) - 0.5) * 40, (r(1) - 0.5) * 24, -r(2) * 40 + 4], i * 3);
    }
    dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    this.dust = new THREE.Points(
      dg,
      new THREE.PointsMaterial({ color: 0xffb0a8, size: 0.035, transparent: true, opacity: 0, depthWrite: false }),
    );
    this.scene.add(this.dust);
  }

  build(svg: string) {
    const parsed = new SVGLoader().parse(svg);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xf23b3f,
      metalness: 0.1,
      roughness: 0.34,
      clearcoat: 0.4,
      clearcoatRoughness: 0.22,
      sheen: 0.15,
      sheenColor: new THREE.Color(0xff9a90),
      side: THREE.DoubleSide,
    });
    let idx = 0;
    parsed.paths.forEach((path) => {
      SVGLoader.createShapes(path).forEach((shape) => {
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: 0.5 * 54,
          bevelEnabled: true,
          bevelThickness: 0.1 * 20,
          bevelSize: 0.1 * 15,
          bevelSegments: 5,
          curveSegments: 14,
        });
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        const c = geometry.boundingBox!.getCenter(new THREE.Vector3());
        geometry.translate(-c.x, -c.y, -c.z);
        const part = lobsterParts[idx];
        const side: Side = part?.startsWith("left") ? -1 : 1;
        let mesh: THREE.Mesh;
        if (part?.endsWith("claw") || part?.endsWith("antenna")) {
          const kind = part.endsWith("claw") ? "claw" : "antenna";
          const chain = makeJointedPart(geometry, material, c, kind, side);
          mesh = chain.mesh;
          (kind === "claw" ? this.claws : this.antennae).push(chain);
        } else {
          mesh = new THREE.Mesh(geometry, material);
          if (part?.endsWith("eye")) this.eyes.push({ mesh, side });
        }
        mesh.position.copy(c);
        mesh.name = part ?? `part-${idx}`;
        idx++;
        this.parts.push(mesh);
        this.model.add(mesh);
      });
    });
    const box = new THREE.Box3().setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    this.model.children.forEach((child) => {
      child.position.sub(center);
      child.userData.home = child.position.clone();
    });
    const size = new THREE.Box3().setFromObject(this.model).getSize(new THREE.Vector3());
    const s = 5.15 / Math.max(size.x, size.y);
    this.model.scale.set(s, -s, s);
  }

  render(st: LogoState) {
    this.camera.position.set(0, 0, st.camZ);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.model.visible = st.visible;
    this.root.position.set(st.x, st.y, st.z);
    this.root.rotation.set(st.rx, st.ry, st.rz);
    this.root.scale.setScalar(st.scale);

    for (const chain of this.claws) {
      const closure = (chain.side === -1 ? st.clawL : st.clawR) * 0.2;
      chain.middle.rotation.z = -chain.side * closure * 2.1;
      chain.tip.rotation.z = -chain.side * closure;
      chain.shoulder.rotation.z = chain.side * (chain.side === -1 ? st.waveL : st.waveR);
    }
    for (const chain of this.antennae) {
      const ph = st.antenna + (chain.side === 1 ? 0.55 : 0);
      chain.middle.rotation.z = Math.sin(ph) * st.antennaAmp * 0.7;
      chain.tip.rotation.z = Math.sin(ph - 0.85) * st.antennaAmp * 1.25;
      chain.middle.rotation.x = Math.sin(ph * 0.72) * st.antennaAmp * 0.2;
      chain.tip.rotation.x = Math.sin(ph * 0.72 - 0.65) * st.antennaAmp * 0.45;
      chain.shoulder.rotation.z = -chain.side * st.antennaLift;
    }
    this.model.children.forEach((child, i) => {
      const home = child.userData.home as THREE.Vector3;
      if (st.explode > 0) {
        const dir = home.clone().setZ(i % 2 ? 60 : -60).normalize();
        child.position.copy(home).add(dir.multiplyScalar(st.explode * (120 + (i % 3) * 40)));
        child.rotation.set(st.explode * (i % 2 ? 0.8 : -0.6), st.explode * ((i % 3) - 1) * 0.9, st.explode * 0.4 * (i - 3));
      } else {
        child.position.copy(home);
        child.rotation.set(0, 0, 0);
      }
    });
    for (const { mesh, side } of this.eyes) mesh.scale.y = Math.max(0.08, 1 - (side === -1 ? st.blinkL : st.blinkR));

    this.wmRoot.visible = st.wm.on;
    if (st.wm.on) {
      animateWordmarkRig(this.wordmark, st.t, 1 / 60, defaultWordmarkMotion, null);
      this.wmRoot.position.set(st.wm.x, st.wm.y, 0);
      this.wmRoot.rotation.set(st.wm.rx, st.wm.ry, 0);
      this.wmRoot.scale.setScalar(Math.max(1e-3, st.wm.scale));
    }

    // Sparks: radial burst in the logo's plane with gravity and fade.
    const sp = this.sparks.geometry.getAttribute("position") as THREE.BufferAttribute;
    const mat = this.sparks.material as THREE.PointsMaterial;
    if (st.sparks >= 0 && st.sparks <= 1) {
      this.sparks.visible = true;
      const p = st.sparks;
      for (let i = 0; i < sp.count; i++) {
        const a = this.sparkSeeds[i * 4]! * Math.PI * 2;
        const sp0 = 2 + this.sparkSeeds[i * 4 + 1]! * 9;
        const zz = (this.sparkSeeds[i * 4 + 2]! - 0.5) * 6;
        const d = 1 - Math.exp(-p * 3.2);
        sp.setXYZ(i, st.x + Math.cos(a) * sp0 * d, st.y + Math.sin(a) * sp0 * d * 0.7 - p * p * 2.5, zz * d);
      }
      sp.needsUpdate = true;
      mat.opacity = Math.max(0, 1 - p) ** 1.5;
    } else this.sparks.visible = false;

    const dm = this.dust.material as THREE.PointsMaterial;
    dm.opacity = st.dust;
    this.dust.visible = st.dust > 0.001;
    this.dust.position.set(Math.sin(st.t * 0.07) * 1.5, Math.cos(st.t * 0.05), (st.t * 0.6) % 8);

    this.renderer.render(this.scene, this.camera);
  }
}
