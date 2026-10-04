import type { ExtendedDownloadClientItem } from "@homarr/integrations";

type DownloadState = ExtendedDownloadClientItem["state"];

export const DOWNLOAD_COLUMN_ACCESSORS = [
  "name",
  "progress",
  "size",
  "downSpeed",
  "upSpeed",
  "time",
  "state",
  "added",
  "ratio",
  "received",
  "sent",
  "category",
  "integration",
  "index",
  "type",
] as const satisfies readonly (keyof ExtendedDownloadClientItem)[];

export const ADVANCED_DOWNLOAD_COLUMN_ACCESSORS = [
  "name",
  "progress",
  "size",
  "downSpeed",
  "upSpeed",
  "time",
  "state",
  "integration",
] as const satisfies readonly (typeof DOWNLOAD_COLUMN_ACCESSORS)[number][];

type DownloadColumnAccessor = (typeof DOWNLOAD_COLUMN_ACCESSORS)[number];

export function getDownloadsStatsDisplay(showCompactStats: boolean, isAdvanced: boolean) {
  return {
    visible: showCompactStats || isAdvanced,
    canToggle: !isAdvanced,
  };
}

export function getDownloadColumnAccessors(
  configuredColumns: readonly DownloadColumnAccessor[],
  isAdvanced: boolean,
): readonly DownloadColumnAccessor[] {
  return isAdvanced ? ADVANCED_DOWNLOAD_COLUMN_ACCESSORS : configuredColumns;
}

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
