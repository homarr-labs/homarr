import type { StatsUnit, StatsValue } from "@homarr/integrations/stats";

export const formatStatsValue = (value: StatsValue | undefined, unit: StatsUnit, compact: boolean) => {
  if (value === null || value === undefined) return "—";
  if (typeof value !== "number") return String(value);
  if (!Number.isFinite(value)) return "—";
  const options: Intl.NumberFormatOptions = { maximumFractionDigits: 2 };
  if (compact) options.notation = "compact";
  if (unit === "bytes" || unit === "bytesPerSecond") {
    let scaled = value;
    const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
    let index = 0;
    while (Math.abs(scaled) >= 1024 && index < units.length - 1) {
      scaled /= 1024;
      index += 1;
    }
    let suffix = units[index];
    if (unit === "bytesPerSecond") suffix += "/s";
    return `${new Intl.NumberFormat(undefined, options).format(scaled)} ${suffix}`;
  }
  const formatted = new Intl.NumberFormat(undefined, options).format(value);
  if (unit === "percent") return `${formatted}%`;
  if (unit === "seconds") return `${formatted} s`;
  if (unit === "milliseconds") return `${formatted} ms`;
  if (unit === "grams") return `${formatted} g`;
  return formatted;
};
