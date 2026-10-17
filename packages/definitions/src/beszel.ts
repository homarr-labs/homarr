import { z } from "zod/v4";

export const beszelTimePeriods = ["1m", "1h", "12h", "24h", "1w", "30d"] as const;
export type BeszelTimePeriod = (typeof beszelTimePeriods)[number];
export const defaultBeszelTimePeriod = "1h" satisfies BeszelTimePeriod;
export const beszelTimePeriodSchema = z.enum(beszelTimePeriods);

export const beszelMetricOptionKeys = [
  "showCpu",
  "showMemory",
  "showDisk",
  "showGpu",
  "showLoadAvg",
  "showNet",
  "showTemp",
  "showBattery",
  "showServices",
  "showUptime",
  "showAgent",
] as const;

export type BeszelMetricOptionKey = (typeof beszelMetricOptionKeys)[number];
export type BeszelMetricOptions = Record<BeszelMetricOptionKey, boolean>;
