export type ModelVariant = "classic" | "chunky" | "rounded" | "metal" | "full";
export type MaterialPreset = "red" | "matte" | "glossy" | "metal" | "chrome" | "plastic" | "glass";
export type RotationAxis = "x" | "y" | "z" | "free";
export type ClawMode = "synchronized" | "alternating" | "offset";

export interface LabConfig {
  variant: ModelVariant;
  material: MaterialPreset;
  depth: number;
  bevel: number;
  wireframe: boolean;
  paused: boolean;
  autoRotate: boolean;
  rotationSpeed: number;
  rotationAxis: RotationAxis;
  idleFloat: boolean;
  idleBody: boolean;
  idleSpeed: number;
  idleStrength: number;
  claws: boolean;
  leftClaw: boolean;
  rightClaw: boolean;
  clawMode: ClawMode;
  clawSpeed: number;
  clawStrength: number;
  clawFrequency: number;
  antennae: boolean;
  leftAntenna: boolean;
  rightAntenna: boolean;
  antennaSpeed: number;
  antennaStrength: number;
  secondaryMotion: boolean;
  eyes: boolean;
  bodyPulse: boolean;
  axes: boolean;
  bounds: boolean;
  pivots: boolean;
  ground: boolean;
  keyLight: number;
  fillLight: number;
  rimLight: number;
  fov: number;
}

export const initialConfig: LabConfig = {
  variant: "classic",
  material: "red",
  depth: 0.48,
  bevel: 0.08,
  wireframe: false,
  paused: false,
  autoRotate: true,
  rotationSpeed: 0.32,
  rotationAxis: "y",
  idleFloat: true,
  idleBody: false,
  idleSpeed: 0.8,
  idleStrength: 0.08,
  claws: true,
  leftClaw: true,
  rightClaw: true,
  clawMode: "offset",
  clawSpeed: 1,
  clawStrength: 0.18,
  clawFrequency: 0.7,
  antennae: true,
  leftAntenna: true,
  rightAntenna: true,
  antennaSpeed: 0.75,
  antennaStrength: 0.1,
  secondaryMotion: true,
  eyes: false,
  bodyPulse: false,
  axes: false,
  bounds: false,
  pivots: false,
  ground: true,
  keyLight: 7,
  fillLight: 3,
  rimLight: 5,
  fov: 34,
};
