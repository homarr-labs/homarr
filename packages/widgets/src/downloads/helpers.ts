import type { ExtendedDownloadClientItem } from "@homarr/integrations";

type DownloadState = ExtendedDownloadClientItem["state"];

export function filterDownloadItemsByStatus<T extends { state: DownloadState }>(
  items: readonly T[],
  statusFilter: readonly string[],
): T[] {
  if (statusFilter.length === 0) return [...items];
  return items.filter(({ state }) => statusFilter.includes(state));
}

export function getAvailableDownloadStates(items: readonly { state: DownloadState }[]): DownloadState[] {
  return [...new Set(items.map(({ state }) => state))];
}

export function columnWidthsToRecord(columnsWidth: readonly Record<string, string | number>[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const entry of columnsWidth) {
    const key = Object.keys(entry)[0];
    if (!key) continue;
    const width = entry[key];
    if (typeof width === "number") result[key] = width;
    else if (typeof width === "string" && width.endsWith("px")) result[key] = parseInt(width, 10);
  }
  return result;
}
