import type { RefinementCtx } from "zod/v4";

import { createCustomErrorParams } from "@homarr/validation/form/i18n";

import { thresholdColor } from "./colors";

type ThresholdMetric = "cpu" | "memory" | "disk" | "gpu" | "temp";
type ThresholdOptions = { thresholdMode: string } & Record<`${ThresholdMetric}${"WarningAt" | "CriticalAt"}`, number>;

export const beszelNeutralColor = "light-dark(var(--mantine-color-gray-6), var(--mantine-color-gray-5))";

export const getBeszelMetricColor = (
  options: ThresholdOptions,
  metric: ThresholdMetric,
  value: number | null,
): string => {
  if (options.thresholdMode === "off") return beszelNeutralColor;
  if (value === null || !Number.isFinite(value)) return "gray";
  if (options.thresholdMode !== "custom") {
    return metric === "temp" ? (value >= 85 ? "red" : value >= 70 ? "yellow" : "green") : thresholdColor(value);
  }
  if (value >= options[`${metric}CriticalAt`]) return "red";
  if (value >= options[`${metric}WarningAt`]) return "yellow";
  return "green";
};

export const beszelOptionsSuperRefine = (data: Record<string, unknown>, ctx: RefinementCtx) => {
  if (data.thresholdMode !== "custom") return;
  for (const metric of ["cpu", "memory", "disk", "gpu", "temp"] as const) {
    const warning = data[`${metric}WarningAt`];
    const critical = data[`${metric}CriticalAt`];
    if (typeof warning === "number" && typeof critical === "number" && warning >= critical) {
      ctx.addIssue({
        code: "custom",
        path: [`${metric}CriticalAt`],
        params: createCustomErrorParams({ key: "criticalThresholdMustExceedWarning", params: {} }),
      });
    }
  }
};
