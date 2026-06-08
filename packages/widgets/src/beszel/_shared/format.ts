const byteUnits = ["B", "KB", "MB", "GB", "TB"] as const;
const rateUnits = ["B/s", "KB/s", "MB/s", "GB/s"] as const;

const formatScaled = (value: number, units: readonly string[], zeroLabel: string): string => {
  if (!value || !Number.isFinite(value)) return zeroLabel;
  const i = Math.max(0, Math.min(Math.floor(Math.log(Math.abs(value)) / Math.log(1024)), units.length - 1));
  const scaled = value / 1024 ** i;
  const decimals = scaled < 10 ? 2 : 1;
  return `${scaled.toFixed(decimals)} ${units[i]!}`;
};

const formatScaledCompact = (value: number, units: readonly string[], zeroLabel: string): string => {
  if (!value || !Number.isFinite(value)) return zeroLabel;
  const i = Math.max(0, Math.min(Math.floor(Math.log(Math.abs(value)) / Math.log(1024)), units.length - 1));
  const scaled = value / 1024 ** i;
  return `${scaled < 10 ? scaled.toFixed(1) : Math.round(scaled)}${units[i]!}`;
};

export const formatByteRate = (value: number): string => formatScaled(value, rateUnits, "0 B/s");

export const formatStorageBytes = (bytes: number): string => formatScaled(bytes, byteUnits, "0 B");

export const formatGB = (value: number): string => {
  if (!value || !Number.isFinite(value)) return "0 GB";
  return `${value.toFixed(2)} GB`;
};

export const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

export const chartAxisFormatters = {
  percent: formatPercent,
  gb: (value: number) => (!value ? "0" : `${Number(value).toFixed(0)}G`),
  mb: (value: number) => (!value ? "0" : `${Number(value).toFixed(0)}M`),
  bytes: (value: number) => formatScaledCompact(Number(value), byteUnits, "0"),
  rate: (value: number) => formatScaledCompact(Number(value), rateUnits, "0"),
} as const;

export const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${minutes} min`;
};

export const formatTemp = (celsius: number | null, fahrenheit: boolean): string => {
  if (celsius === null) return "—";
  if (fahrenheit) return `${((celsius * 9) / 5 + 32).toFixed(1)} °F`;
  return `${celsius.toFixed(2)} °C`;
};

export const formatLoadAvg = (la: [number, number, number] | null): string => {
  if (!la) return "—";
  return la.map((v) => v.toFixed(2)).join(" ");
};
