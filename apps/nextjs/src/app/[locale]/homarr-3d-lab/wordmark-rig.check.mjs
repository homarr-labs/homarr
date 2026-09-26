// Run from the repository root: node --import tsx 'apps/nextjs/src/app/[locale]/homarr-3d-lab/wordmark-rig.check.mjs'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import * as THREE from "three";
import { initialConfig } from "./lab-types.ts";
import { animateWordmarkRig, buildWordmarkRig, defaultWordmarkMotion } from "./wordmark-rig.ts";

globalThis.DOMParser = new JSDOM().window.DOMParser;
const svg = readFileSync(new URL("../../../../public/logo/homarr-wordmark-rig.svg", import.meta.url), "utf8");
const rig = buildWordmarkRig(svg, initialConfig);
assert.equal(rig.breathingOrder.length, 24);
assert.equal(new Set(rig.breathingOrder).size, 24);
assert.deepEqual(
  rig.beamParts.map((part) => part.name),
  [
    "arrow-tip",
    "arrow-segment-five",
    "arrow-segment-four",
    "arrow-segment-three",
    "arrow-segment-two",
    "arrow-segment-one",
    "arrow-head",
  ],
);
assert(rig.beamAnchors.every((anchor, index) => index === 0 || anchor > rig.beamAnchors[index - 1]));
assert(rig.beamParts[0].position.x > rig.beamParts.at(-1).position.x);
const center = new THREE.Box3().setFromObject(rig.model).getCenter(new THREE.Vector3());
assert(center.length() < 0.01);

const breatheOnly = {
  cursor: false,
  arrow: false,
  panels: false,
  letters: false,
  kana: false,
  beam: false,
  breathe: true,
};
rig.breathingOrder.forEach((part, index) => {
  animateWordmarkRig(rig, index * 0.23 + 0.24, 1 / 60, breatheOnly, null);
  if (part === rig.frame) assert(rig.model.scale.x > rig.baseScale * 1.005);
  else assert(part.scale.x > 1.049, `${part.name} did not breathe in sequence`);
});

for (const part of [rig.panels[0], rig.letters[0], rig.kana[0]]) {
  animateWordmarkRig(rig, 1, 1, defaultWordmarkMotion, part.name);
  assert(part.position.z > part.userData.home.z + 40, `${part.name} did not pop on hover`);
}
animateWordmarkRig(rig, 0, 1, defaultWordmarkMotion, null);
assert(rig.beamDots[0].visible);
const rightX = rig.beamDots[0].position.x;
animateWordmarkRig(rig, 4.2, 1, defaultWordmarkMotion, null);
assert(rig.beamDots[0].position.x < rightX);
animateWordmarkRig(rig, 1, 1, { ...defaultWordmarkMotion, beam: false }, null);
assert(rig.beamDots.every((dot) => !dot.visible));
console.log("Wordmark rig check passed: 24 parts, sequential breathing, hover pop, right-to-left beam.");
