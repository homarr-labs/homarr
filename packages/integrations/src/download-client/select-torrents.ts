import type { DownloadClientSelection } from "../interfaces/downloads/download-client-integration";
import type { DownloadClientItem } from "../interfaces/downloads/download-client-items";

type TorrentSelectionFields<TTorrent> = {
  [TField in "category" | "progress" | "upSpeed"]: (torrent: TTorrent) => DownloadClientItem[TField];
} & Partial<Record<keyof DownloadClientItem | "ratio", (torrent: TTorrent) => string | number | string[] | undefined>>;

export function selectDownloadTorrents<TTorrent>(
  torrents: TTorrent[],
  { limit, selection }: { limit: number; selection?: DownloadClientSelection },
  fields: TorrentSelectionFields<TTorrent>,
): TTorrent[] {
  if (!selection) return torrents.slice(0, limit);

  const eligibleTorrents = torrents.filter((torrent) => {
    if (selection.categoryFilter.length > 0) {
      const category = fields.category(torrent) ?? "";
      let categories: string[];
      if (Array.isArray(category)) categories = category;
      else categories = [category];
      const matches = selection.categoryFilter.some((filter) => categories.includes(filter));
      if (matches !== selection.filterIsWhitelist) return false;
    }
    if (fields.progress(torrent) < 1) return true;
    return selection.showCompletedTorrent && (fields.upSpeed(torrent) ?? 0) >= selection.activeTorrentThreshold * 1024;
  });

  const sortValue = fields[selection.sort as keyof typeof fields];
  if (sortValue) {
    let multiplier = 1;
    if (selection.descending) multiplier = -1;
    eligibleTorrents.sort((left, right) => {
      let leftValue = sortValue(left) ?? 0;
      let rightValue = sortValue(right) ?? 0;
      if (selection.sort === "time") {
        if (leftValue === 0) leftValue = Infinity;
        if (rightValue === 0) rightValue = Infinity;
      }
      if (typeof leftValue === "string" && typeof rightValue === "string") {
        return leftValue.localeCompare(rightValue) * multiplier;
      }
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        if (leftValue === rightValue) return 0;
        return (leftValue - rightValue) * multiplier;
      }
      return 0;
    });
  }
  return eligibleTorrents.slice(0, limit);
}
