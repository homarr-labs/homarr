import type { WidgetComponentProps } from "../definition";
import { clampPercentThreshold } from "./threshold-validation";

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
  | "hostsNeedingUpdates"
  | "securityUpdates"
  | "hostsWithSecurityUpdates"
  | "upToDateHosts"
  | "totalOutdatedPackages"
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

type PatchMonColorOptions = WidgetComponentProps<"patchmon">["options"];

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

const thresholdModeOptionKey = {
  hostsNeedingUpdates: "hostsNeedingUpdatesThresholdMode",
  securityUpdates: "securityUpdatesThresholdMode",
  hostsWithSecurityUpdates: "hostsWithSecurityUpdatesThresholdMode",
  upToDateHosts: "upToDateHostsThresholdMode",
  totalOutdatedPackages: "totalOutdatedPackagesThresholdMode",
} as const;

const warningAtOptionKey = {
  hostsNeedingUpdates: "hostsNeedingUpdatesWarningAt",
  securityUpdates: "securityUpdatesWarningAt",
  hostsWithSecurityUpdates: "hostsWithSecurityUpdatesWarningAt",
  upToDateHosts: "upToDateHostsWarningAt",
  totalOutdatedPackages: "totalOutdatedPackagesWarningAt",
} as const;

const criticalAtOptionKey = {
  hostsNeedingUpdates: "hostsNeedingUpdatesCriticalAt",
  securityUpdates: "securityUpdatesCriticalAt",
  hostsWithSecurityUpdates: "hostsWithSecurityUpdatesCriticalAt",
  upToDateHosts: "upToDateHostsCriticalAt",
  totalOutdatedPackages: "totalOutdatedPackagesCriticalAt",
} as const;

const isColorableStat = (statKey: PatchMonStatKey): statKey is ColorablePatchMonStatKey =>
  COLORABLE_PATCHMON_STATS.includes(statKey as ColorablePatchMonStatKey);

const getComparableValue = (
  value: number,
  mode: ThresholdMode,
  context: StatColorContext,
  direction: StatThresholdRule["direction"],
): number => {
  if (mode === "absolute") {
    return value;
  }

  if (context.totalHosts <= 0) {
    if (direction === "higherIsBetter") {
      return 100;
    }

    return value > 0 ? 100 : 0;
  }

  return (value / context.totalHosts) * 100;
};

const resolveLowerIsBetter = (comparable: number, rule: StatThresholdRule): StatSeverity => {
  if (comparable < rule.warningAt) {
    return "green";
  }

  if (rule.skipYellow || comparable >= rule.criticalAt) {
    return "red";
  }

  return "yellow";
};

const resolveHigherIsBetter = (
  value: number,
  comparable: number,
  context: StatColorContext,
  rule: StatThresholdRule,
): StatSeverity => {
  if (context.totalHosts > 0 && value >= context.totalHosts) {
    return "green";
  }

  if (comparable >= rule.warningAt) {
    return "green";
  }

  if (rule.skipYellow || comparable < rule.criticalAt) {
    return "red";
  }

  return "yellow";
};

const getThresholdRule = (statKey: ColorablePatchMonStatKey, options: PatchMonColorOptions): StatThresholdRule => {
  if (!options.useCustomThresholds) {
    return PATCHMON_STAT_COLOR_PRESETS[statKey];
  }

  const mode = options[thresholdModeOptionKey[statKey]] as ThresholdMode;
  const warningAt = clampPercentThreshold(options[warningAtOptionKey[statKey]] as number, mode);
  const criticalAt = clampPercentThreshold(options[criticalAtOptionKey[statKey]] as number, mode);
  const preset = PATCHMON_STAT_COLOR_PRESETS[statKey];

  return {
    direction: preset.direction,
    mode,
    warningAt,
    criticalAt,
    skipYellow: preset.skipYellow && warningAt === criticalAt,
  };
};

export const resolveStatColor = (
  statKey: PatchMonStatKey,
  value: number,
  context: StatColorContext,
  options: PatchMonColorOptions,
): StatSeverity => {
  if (!options.enableThresholdColors || !isColorableStat(statKey)) {
    return "neutral";
  }

  const rule = getThresholdRule(statKey, options);
  const comparable = getComparableValue(value, rule.mode, context, rule.direction);

  if (rule.direction === "higherIsBetter") {
    return resolveHigherIsBetter(value, comparable, context, rule);
  }

  return resolveLowerIsBetter(comparable, rule);
};

export const severityToMantineColor = (severity: StatSeverity): string =>
  severity === "neutral" ? "var(--mantine-primary-color-filled)" : severity;

export const severityToMantineBgColor = (severity: StatSeverity): string => {
  if (severity === "neutral") return "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))";
  return `var(--mantine-color-${severity}-light)`;
};

export const severityToIconColor = (severity: StatSeverity): string => {
  if (severity === "neutral") return "var(--mantine-color-dimmed)";
  return `var(--mantine-color-${severity}-6)`;
};
