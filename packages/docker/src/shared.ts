import type { MantineColor } from "@mantine/core";

import type { ContainerState } from ".";

export const containerStateColorMap = {
  created: "cyan",
  running: "green",
  paused: "yellow",
  restarting: "orange",
  exited: "red",
  removing: "pink",
  dead: "dark",
} satisfies Record<ContainerState, MantineColor>;

export const memoryUsageColor = (number: number, state: string): MantineColor => {
  const mbUsage = number / 1024 / 1024;
  if (mbUsage === 0 && state !== "running") return "red";
  if (mbUsage < 128) return "green";
  if (mbUsage < 256) return "yellow";
  if (mbUsage < 512) return "orange";
  return "red";
};

export const cpuUsageColor = (number: number, state: string): MantineColor => {
  if (number === 0 && state !== "running") return "red";
  if (number < 40) return "green";
  if (number < 60) return "yellow";
  if (number < 90) return "orange";
  return "red";
};

export const safeValue = (value?: number, fallback = 0): number => (value !== undefined && !isNaN(value) ? value : fallback);
