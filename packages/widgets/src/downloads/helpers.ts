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

type DownloadColumnAccessor = (typeof DOWNLOAD_COLUMN_ACCESSORS)[number];

export function getDownloadColumnAccessors(
  configuredColumns: readonly DownloadColumnAccessor[],
  isAdvanced: boolean,
): readonly DownloadColumnAccessor[] {
  return isAdvanced ? DOWNLOAD_COLUMN_ACCESSORS : configuredColumns;
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
