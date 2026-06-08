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
