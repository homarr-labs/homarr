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
