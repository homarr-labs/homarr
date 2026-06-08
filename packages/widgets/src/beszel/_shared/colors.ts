import type { BeszelSystemStatus } from "./types";

export const thresholdColor = (value: number): string => {
  if (value >= 80) return "red";
  if (value >= 50) return "yellow";
  return "green";
};

export const loadAvgColor = (la1: number, cores: number): string => {
  const ratio = la1 / cores;
  if (ratio >= 1.5) return "red";
  if (ratio >= 0.8) return "yellow";
  return "green";
};

export const statusColorMap: Record<BeszelSystemStatus, string> = {
  up: "green",
  down: "red",
  paused: "gray",
  pending: "yellow",
};

export const alertColorMap: Record<string, string> = {
  triggered: "red",
  ok: "green",
};

export const containerColors = [
  "blue.6",
  "teal.6",
  "orange.6",
  "grape.6",
  "cyan.6",
  "pink.6",
  "lime.6",
  "violet.6",
  "indigo.6",
  "yellow.6",
  "red.6",
  "green.6",
  "blue.4",
  "teal.4",
  "orange.4",
];
