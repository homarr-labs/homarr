import { describe, expect, test } from "vitest";
import { z } from "zod/v4";

import { clampPercentThreshold, patchmonOptionsSuperRefine } from "../threshold-validation";

const baseOptions = {
  enableThresholdColors: true,
  useCustomThresholds: true,
  hostsNeedingUpdatesThresholdMode: "percent",
  hostsNeedingUpdatesWarningAt: 10,
  hostsNeedingUpdatesCriticalAt: 20,
  securityUpdatesThresholdMode: "absolute",
  securityUpdatesWarningAt: 1,
  securityUpdatesCriticalAt: 10,
  hostsWithSecurityUpdatesThresholdMode: "absolute",
  hostsWithSecurityUpdatesWarningAt: 1,
  hostsWithSecurityUpdatesCriticalAt: 1,
  upToDateHostsThresholdMode: "percent",
  upToDateHostsWarningAt: 90,
  upToDateHostsCriticalAt: 90,
  totalOutdatedPackagesThresholdMode: "absolute",
  totalOutdatedPackagesWarningAt: 1,
  totalOutdatedPackagesCriticalAt: 50,
};

const optionsSchema = z.object({
  hostsNeedingUpdatesWarningAt: z.number().int().min(0),
  hostsNeedingUpdatesCriticalAt: z.number().int().min(0),
  securityUpdatesWarningAt: z.number().int().min(0),
  securityUpdatesCriticalAt: z.number().int().min(0),
  hostsWithSecurityUpdatesWarningAt: z.number().int().min(0),
  hostsWithSecurityUpdatesCriticalAt: z.number().int().min(0),
  upToDateHostsWarningAt: z.number().int().min(0),
  upToDateHostsCriticalAt: z.number().int().min(0),
  totalOutdatedPackagesWarningAt: z.number().int().min(0),
  totalOutdatedPackagesCriticalAt: z.number().int().min(0),
  enableThresholdColors: z.boolean(),
  useCustomThresholds: z.boolean(),
  hostsNeedingUpdatesThresholdMode: z.enum(["absolute", "percent"]),
  securityUpdatesThresholdMode: z.enum(["absolute", "percent"]),
  hostsWithSecurityUpdatesThresholdMode: z.enum(["absolute", "percent"]),
  upToDateHostsThresholdMode: z.enum(["absolute", "percent"]),
  totalOutdatedPackagesThresholdMode: z.enum(["absolute", "percent"]),
}).superRefine(patchmonOptionsSuperRefine);

describe("patchmonOptionsSuperRefine", () => {
  test("accepts percent thresholds within 0-100", () => {
    const result = optionsSchema.safeParse(baseOptions);

    expect(result.success).toBe(true);
  });

  test("rejects percent thresholds above 100", () => {
    const result = optionsSchema.safeParse({
      ...baseOptions,
      hostsNeedingUpdatesWarningAt: 101,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("hostsNeedingUpdatesWarningAt"))).toBe(true);
    }
  });

  test("allows absolute thresholds above 100", () => {
    const result = optionsSchema.safeParse({
      ...baseOptions,
      hostsNeedingUpdatesThresholdMode: "absolute",
      hostsNeedingUpdatesWarningAt: 150,
      hostsNeedingUpdatesCriticalAt: 200,
    });

    expect(result.success).toBe(true);
  });

  test("skips validation when custom thresholds are disabled", () => {
    const result = optionsSchema.safeParse({
      ...baseOptions,
      useCustomThresholds: false,
      hostsNeedingUpdatesWarningAt: 500,
    });

    expect(result.success).toBe(true);
  });
});

describe("clampPercentThreshold", () => {
  test("clamps percent values to 0-100", () => {
    expect(clampPercentThreshold(150, "percent")).toBe(100);
    expect(clampPercentThreshold(-5, "percent")).toBe(0);
    expect(clampPercentThreshold(42.9, "percent")).toBe(42);
  });

  test("leaves absolute values unchanged", () => {
    expect(clampPercentThreshold(150, "absolute")).toBe(150);
  });
});
