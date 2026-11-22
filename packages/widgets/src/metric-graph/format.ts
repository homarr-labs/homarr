import type { StatsUnit } from "@homarr/integrations/stats";

import { formatStatsValue } from "../stats/format";

export interface MetricPoint {
  time: number;
  value: number | null;
}

export interface MetricSeries {
  key: string;
  name: string;
  /** Statistics unit, or the free-form unit a smart-home sensor reports. */
  unit: string | null;
  current: number | null;
  points: MetricPoint[];
}

const statsUnits = new Set<string>([
  "count",
  "bytes",
  "grams",
  "percent",
  "seconds",
  "milliseconds",
  "bytesPerSecond",
  "celsius",
  "watts",
]);
const isStatsUnit = (unit: string): unit is StatsUnit => statsUnits.has(unit);

export const formatMetricValue = (value: number | null | undefined, unit: string | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (unit !== null && isStatsUnit(unit)) return formatStatsValue(value, unit, false);
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
};

// Rates and power read as amounts, so their scale starts at zero and heights keep their ratio.
const zeroBasedUnits = new Set(["bytesPerSecond", "watts", "W", "kW", "VA", "A", "mA"]);

/**
 * Extends the first and last known value over a short run of missing samples at either edge, so a
 * series whose source reports slightly after the window starts still draws from edge to edge.
 * Longer gaps stay empty because they mean no data was recorded.
 */
export const fillEdges = (values: readonly (number | null)[], maxSamples = 2) => {
  const filled = [...values];
  const first = filled.findIndex((value) => value !== null);
  if (first === -1) return filled;
  if (first <= maxSamples) filled.fill(filled[first] ?? null, 0, first);
  const last = filled.findLastIndex((value) => value !== null);
  if (filled.length - 1 - last <= maxSamples) filled.fill(filled[last] ?? null, last + 1);
  return filled;
};

/** Median of the known values in the visible time range, or null without data. */
export const getMedian = (values: readonly (number | null)[]) => {
  const known = values.filter((value): value is number => value !== null).toSorted((left, right) => left - right);
  if (known.length === 0) return null;
  const middle = Math.floor(known.length / 2);
  if (known.length % 2 === 1) return known[middle] ?? null;
  return ((known[middle - 1] ?? 0) + (known[middle] ?? 0)) / 2;
};

export const isPercentUnit = (unit: string | null) => unit === "percent" || unit === "%";

/**
 * Value range for one series. Percentages keep their full scale, rates and power start at zero; other
 * values (temperatures, counts) use a padded min/max range so small changes stay visible.
 */
export const getSeriesDomain = (values: readonly number[], unit: string | null): readonly [number, number] => {
  if (isPercentUnit(unit)) return [0, 100];
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (unit !== null && zeroBasedUnits.has(unit) && min >= 0) return [0, Math.max(max * 1.1, 1)];
  const padding = max === min ? Math.max(Math.abs(max) * 0.1, 1) : (max - min) * 0.2;
  return [min - padding, max + padding];
};

/** Rescales a series into 0–100 so values with different units can share one graph. */
export const normalizeValues = (values: readonly (number | null)[], [min, max]: readonly [number, number]) =>
  values.map((value) => (value === null ? null : ((value - min) / (max - min || 1)) * 100));

/** Samples each series at the same moments so a combined graph lines its values up in time. */
export const alignToGrid = (points: readonly MetricPoint[], grid: readonly number[]) => {
  let cursor = 0;
  let current: number | null = null;
  return grid.map((time) => {
    while (cursor < points.length && (points[cursor]?.time ?? Number.POSITIVE_INFINITY) <= time) {
      current = points[cursor]?.value ?? current;
      cursor++;
    }
    return current;
  });
};
