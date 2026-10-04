import type { WazuhSeverity } from "@homarr/integrations/types";

export const wazuhSeverityColors: Record<WazuhSeverity, string> = {
  low: "blue",
  medium: "yellow",
  high: "orange",
  critical: "red",
};

/** Mantine color tokens used by charts (shade picked for contrast on the dark theme). */
export const wazuhSeverityChartColors: Record<WazuhSeverity, string> = {
  low: "blue.6",
  medium: "yellow.5",
  high: "orange.6",
  critical: "red.7",
};

/** Wazuh dashboard buckets: low 0-6, medium 7-11, high 12-14, critical 15+. */
export const getWazuhSeverityForLevel = (level: number): WazuhSeverity => {
  if (level >= 15) return "critical";
  if (level >= 12) return "high";
  if (level >= 7) return "medium";
  return "low";
};

/** Badge color for a rule level; very low levels are informational and rendered grey. */
export const getWazuhLevelColor = (level: number) =>
  level < 4 ? "gray" : wazuhSeverityColors[getWazuhSeverityForLevel(level)];

export const wazuhSeverities = ["critical", "high", "medium", "low"] as const satisfies readonly WazuhSeverity[];

/** Vulnerability severities as stored in wazuh-states-vulnerabilities-* ("Critical", "High", ...). */
export const getVulnerabilitySeverityColor = (severity: string) => {
  const key = severity.toLowerCase();
  if (key === "critical") return "red";
  if (key === "high") return "orange";
  if (key === "medium") return "yellow";
  if (key === "low") return "blue";
  return "gray";
};

/** Compact number formatting for stat tiles (12345 -> 12.3K). */
export const formatWazuhCount = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);

/** Relative change between two periods, or null when there is no baseline. */
export const getWazuhTrend = (current: number, previous: number): number | null => {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
};

export const formatWazuhTrend = (trend: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: Math.abs(trend) < 0.1 ? 1 : 0,
    signDisplay: "exceptZero",
    // Normalise -0 so an unchanged bucket reads "0%" instead of "-0%".
  }).format(Math.abs(trend) < 0.0005 ? 0 : trend);
