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
