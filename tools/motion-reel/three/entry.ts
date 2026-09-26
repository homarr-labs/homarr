import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { extrudeSvg } from "./logo-rig";
import { buildWordmarkRig, animateWordmarkRig, defaultWordmarkMotion } from "./wordmark-rig";
import { initialConfig } from "./lab-types";
(window as any).Homarr3D = {
  THREE,
  SVGLoader,
  RoomEnvironment,
  extrudeSvg,
  buildWordmarkRig,
  animateWordmarkRig,
  defaultWordmarkMotion,
  initialConfig,
};
