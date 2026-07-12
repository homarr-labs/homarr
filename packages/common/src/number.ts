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

export const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 *  Number of bytes to a human-readable string using binary (KiB) suffixes.
 *  Does not accept floats; size in bytes should be an integer.
 *  Will return "NaI" and log a warning if a float is passed.
 *  `concat` is appended after the unit so it is omitted when the returned
 *  value is "NaI" or "∞". Returns "∞" if the size is too large to be
 *  represented in the current format.
 *
 *  @deprecated Use `formatBytes` for single values, `formatBytesPair` for
 *  paired "used / total" displays, and `formatByteRate` for byte-per-second
 *  rates. This function is kept for backwards compatibility but should not
 *  be used in new code.
 */
export const humanFileSize = (size: number, concat = ""): string => {
  //64bit limit for Number stops at EiB
  const siRanges = ["B", "kiB", "MiB", "GiB", "TiB", "PiB", "EiB"];
  if (!Number.isInteger(size)) {
    console.warn(
      "Invalid use of the humanFileSize function with a float, please report this and what integration this is impacting.",
    );
    //Not an Integer
    return "NaI";
  }
  let count = 0;
  while (count < siRanges.length) {
    const tempSize = size / Math.pow(1024, count);
    if (tempSize < 1024) {
      return tempSize.toFixed(Math.min(count, 1)) + siRanges[count] + concat;
    }
    count++;
  }
  return "∞";
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
 * `formatBytesPair` when two related values (e.g. used and available) should
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
  const index = pickUnitIndex(safe, base, units.length - 1);
  const scaled = safe / base ** index;
  return `${scaled.toFixed(1)} ${units[index]}`;
};

/**
 * Format two related byte values (typically `used` and `available`) with a
 * shared unit. The unit is picked from the sum of the two values so the
 * combined display stays consistent.
 *
 * @example
 * formatBytesPair(985828802560, 2858736793190);
 * // { used: "0.9 TiB", available: "2.6 TiB" }
 */
export const formatBytesPair = (
  used: number,
  available: number,
  options: FormatBytesOptions = {},
): { used: string; available: string } => {
  const { units, base } = resolveUnitConfig(options);
  const safeUsed = sanitizeBytes(used);
  const safeAvailable = sanitizeBytes(available);
  const index = pickUnitIndex(safeUsed + safeAvailable, base, units.length - 1);
  const suffix = units[index];
  return {
    used: `${(safeUsed / base ** index).toFixed(1)} ${suffix}`,
    available: `${(safeAvailable / base ** index).toFixed(1)} ${suffix}`,
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

const IMPERIAL_MULTIPLIER = 1.609344;

export const metricToImperial = (metricValue: number) => metricValue / IMPERIAL_MULTIPLIER;
export const imperialToMetric = (imperialValue: number) => imperialValue * IMPERIAL_MULTIPLIER;
