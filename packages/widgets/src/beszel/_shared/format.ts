export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B/s";
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[i]}`;
};

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

export const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

export const formatLoadAvg = (la: [number, number, number] | null): string => {
  if (!la) return "—";
  return la.map((v) => v.toFixed(2)).join(" ");
};
