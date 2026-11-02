import { describe, expect, test } from "vitest";

import type { DownloadClientSelection } from "../interfaces/downloads/download-client-integration";
import { selectDownloadTorrents } from "./select-torrents";

interface FixtureTorrent {
  name: string;
  category?: string | string[];
  progress: number;
  upSpeed: number;
}

const selection = (overrides: Partial<DownloadClientSelection> = {}): DownloadClientSelection => ({
  sort: "name",
  descending: false,
  categoryFilter: ["sonarr", "radarr"],
  filterIsWhitelist: true,
  showCompletedTorrent: true,
  activeTorrentThreshold: 0,
  ...overrides,
});

const fields = {
  category: (torrent: FixtureTorrent) => torrent.category,
  progress: (torrent: FixtureTorrent) => torrent.progress,
  upSpeed: (torrent: FixtureTorrent) => torrent.upSpeed,
  name: (torrent: FixtureTorrent) => torrent.name,
};

const torrents: FixtureTorrent[] = [
  { name: "labelled", category: "Radarr", progress: 0.4, upSpeed: 0 },
  { name: "other", category: "movies", progress: 0.2, upSpeed: 0 },
  { name: "uncategorized", progress: 0.8, upSpeed: 0 },
  { name: "labels", category: ["tv", "sonarr"], progress: 0.1, upSpeed: 0 },
];

describe("selectDownloadTorrents category filter", () => {
  test("keeps matching categories and clients that have no category", () => {
    const selected = selectDownloadTorrents(torrents, { limit: 10, selection: selection() }, fields);
    expect(selected.map((torrent) => torrent.name)).toEqual(["labelled", "labels", "uncategorized"]);
  });

  test("keeps matching downloads when the category list is not a whitelist", () => {
    const selected = selectDownloadTorrents(
      torrents,
      { limit: 10, selection: selection({ filterIsWhitelist: false }) },
      fields,
    );
    expect(selected.map((torrent) => torrent.name)).toEqual(["labelled", "labels", "other", "uncategorized"]);
  });
});
