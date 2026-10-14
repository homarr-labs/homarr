export type PatchMonStatKey =
  | "totalHosts"
  | "hostsNeedingUpdates"
  | "securityUpdates"
  | "upToDateHosts"
  | "hostsWithSecurityUpdates"
  | "recentUpdates24h"
  | "totalOutdatedPackages"
  | "totalRepos";

export type ColorablePatchMonStatKey = Extract<
  PatchMonStatKey,
  "hostsNeedingUpdates" | "securityUpdates" | "hostsWithSecurityUpdates" | "upToDateHosts" | "totalOutdatedPackages"
>;

export type StatSeverity = "green" | "yellow" | "red" | "neutral";
export type ThresholdMode = "absolute" | "percent";

export interface StatColorContext {
  totalHosts: number;
}

export interface StatThresholdRule {
  direction: "lowerIsBetter" | "higherIsBetter";
  mode: ThresholdMode;
  warningAt: number;
  criticalAt: number;
  skipYellow?: boolean;
}

export const COLORABLE_PATCHMON_STATS = [
  "hostsNeedingUpdates",
  "securityUpdates",
  "hostsWithSecurityUpdates",
  "upToDateHosts",
  "totalOutdatedPackages",
] as const satisfies readonly ColorablePatchMonStatKey[];

export const NEUTRAL_PATCHMON_STATS = ["totalHosts", "totalRepos", "recentUpdates24h"] as const;

export const PATCHMON_STAT_COLOR_PRESETS: Record<ColorablePatchMonStatKey, StatThresholdRule> = {
  hostsNeedingUpdates: {
    direction: "lowerIsBetter",
    mode: "absolute",
    warningAt: 1,
    criticalAt: 5,
  },
  securityUpdates: {
    direction: "lowerIsBetter",
    mode: "absolute",
    warningAt: 1,
    criticalAt: 10,
  },
  hostsWithSecurityUpdates: {
    direction: "lowerIsBetter",
    mode: "absolute",
    warningAt: 1,
    criticalAt: 1,
    skipYellow: true,
  },
  upToDateHosts: {
    direction: "higherIsBetter",
    mode: "percent",
    warningAt: 90,
    criticalAt: 90,
  },
  totalOutdatedPackages: {
    direction: "lowerIsBetter",
    mode: "absolute",
    warningAt: 1,
    criticalAt: 50,
  },
};
