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

// Beszel 0.21.0 (ec96c134), internal/site/src/index.css and components/charts/hooks.ts.
export const beszelChartColors = {
  cpu: "hsl(220 70% 50%)",
  memory: "hsl(160 60% 45%)",
  cache: "hsl(160 60% 45% / 0.5)",
  disk: "hsl(280 65% 60%)",
  write: "hsl(30 80% 55%)",
  sent: "hsl(340 75% 55%)",
};

export const containerChartColor = (rank: number, count: number) =>
  `hsl(${(rank * 360) / count} var(--beszel-chart-saturation) var(--beszel-chart-lightness))`;
