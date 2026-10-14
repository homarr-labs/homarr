import type {
  ColorablePatchMonStatKey,
  PatchMonStatKey,
  StatColorContext,
  StatSeverity,
  StatThresholdRule,
  ThresholdMode,
} from "./stat-color-presets";
import { COLORABLE_PATCHMON_STATS, PATCHMON_STAT_COLOR_PRESETS } from "./stat-color-presets";
import { clampPercentThreshold } from "./threshold-validation";

export * from "./stat-color-presets";

type PatchMonColorOptions = {
  enableThresholdColors: boolean;
  useCustomThresholds: boolean;
} & Record<`${ColorablePatchMonStatKey}ThresholdMode`, ThresholdMode> &
  Record<`${ColorablePatchMonStatKey}WarningAt` | `${ColorablePatchMonStatKey}CriticalAt`, number>;

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

  const mode = options[thresholdModeOptionKey[statKey]];
  const warningAt = clampPercentThreshold(options[warningAtOptionKey[statKey]], mode);
  const criticalAt = clampPercentThreshold(options[criticalAtOptionKey[statKey]], mode);
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
