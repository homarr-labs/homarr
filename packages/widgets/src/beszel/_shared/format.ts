import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(duration);
dayjs.extend(relativeTime);

const compactByteLabel = (value: number, formatter: (value: number) => string): string => {
  if (!value || !Number.isFinite(value)) return "0";
  return formatter(Number(value)).replace(".0 ", "").replace(" ", "");
};

export const createByteChartAxisFormatters = (
  formatBytes: (bytes: number) => string,
  formatByteRate: (bytes: number) => string,
) => ({
  bytes: (value: number) => compactByteLabel(value, formatBytes),
  rate: (value: number) => compactByteLabel(value, formatByteRate),
});

export const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

export const formatWatts = (value: number): string => `${value.toFixed(1)} W`;

// Native Beszel uses binary byte divisors with B/KB/MB/GB labels and two tooltip decimals.
// Keep this contract local to its charts; dashboard-wide byte preferences remain independent.
export const createBeszelChartFormatters = (locale: string) => {
  const decimal = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const compact = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const units = ["B", "KB", "MB", "GB", "TB"];
  const bytes = (value: number, axis = false) => {
    let unit = 0;
    if (value >= 100) unit = 1;
    while (unit < units.length - 1 && value >= 1000 * 1024 ** unit) unit++;
    const scaled = value / 1024 ** unit;
    if (axis) {
      let rounded = scaled;
      if (scaled >= 10) rounded = Math.round(scaled);
      return `${compact.format(rounded)} ${units[unit]}`;
    }
    return `${decimal.format(scaled)} ${units[unit]}`;
  };
  return {
    bytes: (value: number) => bytes(value),
    bytesAxis: (value: number) => bytes(value, true),
    memory: (mebibytes: number) => bytes(mebibytes * 1024 ** 2),
    memoryAxis: (mebibytes: number) => bytes(mebibytes * 1024 ** 2, true),
    rate: (value: number) => `${bytes(value)}/s`,
    rateAxis: (value: number) => `${bytes(value, true)}/s`,
    percent: (value: number) => `${decimal.format(value)}%`,
    watts: (value: number) => `${decimal.format(value)}W`,
  };
};

export const getProgressTrackSize = (size: "xs" | "sm"): number => (size === "xs" ? 6 : 9);

export const formatUptime = (seconds: number): string => dayjs.duration(seconds, "seconds").humanize();

export const formatTemp = (celsius: number | null, fahrenheit: boolean): string => {
  if (celsius === null) return "—";
  if (fahrenheit) return `${((celsius * 9) / 5 + 32).toFixed(1)} °F`;
  return `${celsius.toFixed(2)} °C`;
};

export const formatLoadAvg = (la: [number, number, number] | null): string => {
  if (!la) return "—";
  return la.map((v) => v.toFixed(2)).join(" ");
};
