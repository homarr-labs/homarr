import type { RefinementCtx } from "zod/v4";
import { z } from "zod/v4";

import type { ThresholdMode } from "./stat-colors";

const percentThresholdSchema = z.number().int().min(0).max(100);

export const PATCHMON_THRESHOLD_PAIRS = [
  {
    mode: "hostsNeedingUpdatesThresholdMode",
    warningAt: "hostsNeedingUpdatesWarningAt",
    criticalAt: "hostsNeedingUpdatesCriticalAt",
  },
  {
    mode: "securityUpdatesThresholdMode",
    warningAt: "securityUpdatesWarningAt",
    criticalAt: "securityUpdatesCriticalAt",
  },
  {
    mode: "hostsWithSecurityUpdatesThresholdMode",
    warningAt: "hostsWithSecurityUpdatesWarningAt",
    criticalAt: "hostsWithSecurityUpdatesCriticalAt",
  },
  {
    mode: "upToDateHostsThresholdMode",
    warningAt: "upToDateHostsWarningAt",
    criticalAt: "upToDateHostsCriticalAt",
  },
  {
    mode: "totalOutdatedPackagesThresholdMode",
    warningAt: "totalOutdatedPackagesWarningAt",
    criticalAt: "totalOutdatedPackagesCriticalAt",
  },
] as const;

export const clampPercentThreshold = (value: number, mode: ThresholdMode): number =>
  mode === "percent" ? Math.min(100, Math.max(0, Math.trunc(value))) : value;

export const patchmonOptionsSuperRefine = (data: Record<string, unknown>, ctx: RefinementCtx) => {
  if (!data.enableThresholdColors || !data.useCustomThresholds) {
    return;
  }

  for (const { mode, warningAt, criticalAt } of PATCHMON_THRESHOLD_PAIRS) {
    if (data[mode] !== "percent") {
      continue;
    }

    for (const key of [warningAt, criticalAt] as const) {
      const result = percentThresholdSchema.safeParse(data[key]);

      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({ ...issue, path: [key] });
        }
      }
    }
  }
};
