const ranges = [
  { divider: 1e18, suffix: "E" },
  { divider: 1e15, suffix: "P" },
  { divider: 1e12, suffix: "T" },
  { divider: 1e9, suffix: "G" },
  { divider: 1e6, suffix: "M" },
  { divider: 1e3, suffix: "k" },
];

export const formatNumber = (value: number, decimalPlaces: number) => {
  for (const range of ranges) {
    if (value < range.divider) continue;

    return (value / range.divider).toFixed(decimalPlaces) + range.suffix;
  }
  return value.toFixed(decimalPlaces);
};

const BINARY_UNITS = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"] as const;
const DECIMAL_UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB"] as const;

export type ByteUnitSystem = "binary" | "decimal";

export interface FormatBytesOptions {
  /**
   * Unit system to use. "binary" uses 1024 as the base and KiB/MiB/GiB/TiB suffixes,
   * "decimal" uses 1000 as the base and KB/MB/GB/TB suffixes. Defaults to "binary".
   */
  unit?: ByteUnitSystem;
}

const pickUnitIndex = (bytes: number, base: number, lastIndex: number): number => {
  if (!Number.isFinite(bytes) || bytes <= 0) return 0;
  let index = 0;
  let value = bytes;
  while (value >= base && index < lastIndex) {
    value /= base;
    index++;
  }
  return index;
};

const pickRoundedUnitIndex = (value: number, base: number, lastIndex: number, fractionDigits: number): number => {
  const index = pickUnitIndex(value, base, lastIndex);
  if (index >= lastIndex) return index;
  const scaled = value / base ** index;
  return Number(scaled.toFixed(fractionDigits)) >= base ? index + 1 : index;
};

const sanitizeBytes = (bytes: number): number => (Number.isFinite(bytes) && bytes > 0 ? bytes : 0);

const resolveUnitConfig = (options: FormatBytesOptions) => {
  const { unit = "binary" } = options;
  return {
    units: unit === "binary" ? BINARY_UNITS : DECIMAL_UNITS,
    base: unit === "binary" ? 1024 : 1000,
  };
};

/**
 * Format a byte value as a human-readable string with a unit suffix.
 *
 * Picks the largest unit that keeps the scaled value below the base. Use
 * `formatBytesPair` when two related values (e.g. used and total) should
 * share a common unit.
 *
 * @example
 * formatBytes(0);                          // "0.0 B"
 * formatBytes(1024);                       // "1.0 KiB"
 * formatBytes(985828802560);               // "918.1 GiB"
 * formatBytes(985828802560, { unit: "decimal" }); // "985.8 GB"
 */
export const formatBytes = (bytes: number, options: FormatBytesOptions = {}): string => {
  const { units, base } = resolveUnitConfig(options);
  const safe = sanitizeBytes(bytes);
  const index = pickRoundedUnitIndex(safe, base, units.length - 1, 1);
  const scaled = safe / base ** index;
  return `${scaled.toFixed(1)} ${units[index]}`;
};

/**
 * Format two related byte values (typically `used` and `total`) with a shared
 * unit. The unit is picked from the larger displayed value so the pair stays
 * consistent without promoting both values before either crosses a boundary.
 *
 * @example
 * formatBytesPair(985828802560, 2858736793190);
 * // { used: "0.9 TiB", total: "2.6 TiB" }
 */
export const formatBytesPair = (
  used: number,
  total: number,
  options: FormatBytesOptions = {},
): { used: string; total: string } => {
  const { units, base } = resolveUnitConfig(options);
  const safeUsed = sanitizeBytes(used);
  const safeTotal = sanitizeBytes(total);
  const index = pickRoundedUnitIndex(Math.max(safeUsed, safeTotal), base, units.length - 1, 1);
  const suffix = units[index];
  return {
    used: `${(safeUsed / base ** index).toFixed(1)} ${suffix}`,
    total: `${(safeTotal / base ** index).toFixed(1)} ${suffix}`,
  };
};

/**
 * Format a byte-per-second rate (e.g. network throughput) as a human-readable
 * string with a `/s` suffix. The value is formatted with the same rules as
 * `formatBytes` and a trailing `/s` is appended.
 *
 * @example
 * formatByteRate(0);                          // "0.0 B/s"
 * formatByteRate(1024);                       // "1.0 KiB/s"
 * formatByteRate(985828802560, { unit: "decimal" }); // "985.8 GB/s"
 */
export const formatByteRate = (bytes: number, options: FormatBytesOptions = {}): string =>
  `${formatBytes(bytes, options)}/s`;

const BIT_RATE_UNITS = ["b/s", "Kb/s", "Mb/s", "Gb/s", "Tb/s", "Pb/s", "Eb/s"] as const;

export interface FormatBitRateOptions {
  /** Maximum number of fractional digits. Trailing zeroes are omitted. Defaults to 1. */
  maximumFractionDigits?: number;
}

/**
 * Format a bit-per-second rate using decimal SI units.
 *
 * Inputs are always bits per second. Callers whose upstream contract uses
 * kilobits must normalize explicitly before calling this function.
 *
 * @example
 * formatBitRate(999);       // "999 b/s"
 * formatBitRate(1_000);     // "1 Kb/s"
 * formatBitRate(1_500_000); // "1.5 Mb/s"
 */
export const formatBitRate = (bitsPerSecond: number, options: FormatBitRateOptions = {}): string => {
  const safeRate = Number.isFinite(bitsPerSecond) && bitsPerSecond > 0 ? bitsPerSecond : 0;
  const requestedDigits = options.maximumFractionDigits ?? 1;
  const maximumFractionDigits = Math.max(0, Math.min(20, Math.trunc(requestedDigits)));
  const index = pickRoundedUnitIndex(safeRate, 1000, BIT_RATE_UNITS.length - 1, maximumFractionDigits);
  const scaled = safeRate / 1000 ** index;
  const formatted = Number(scaled.toFixed(maximumFractionDigits)).toString();
  return `${formatted} ${BIT_RATE_UNITS[index]}`;
};

const IMPERIAL_MULTIPLIER = 1.609344;

export const metricToImperial = (metricValue: number) => metricValue / IMPERIAL_MULTIPLIER;
