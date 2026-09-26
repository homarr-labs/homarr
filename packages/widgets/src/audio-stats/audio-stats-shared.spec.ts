import type { AudiobookshelfDashboardData, NavidromeDashboardData } from "@homarr/integrations/types";
import { describe, expect, test } from "vitest";

import { getVisibleStats } from "./shared";

describe("getVisibleStats", () => {
  const navidromeStats: NavidromeDashboardData = {
    artistCount: 100,
    albumCount: 200,
    songCount: 3000,
  };

  const audiobookshelfStats: AudiobookshelfDashboardData = {
    libraryCount: 3,
    totalAudiobooks: 150,
    totalPodcasts: 20,
    totalListeningTimeSeconds: 86400,
    activeSessions: 2,
  };

  test("returns only enabled navidrome stats", () => {
    const result = getVisibleStats(
      "navidrome",
      { showArtists: true, showAlbums: false, showSongs: true },
      navidromeStats,
    );
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.statKey)).toEqual(["artists", "songs"]);
    expect(result[0]?.value).toBe(100);
    expect(result[1]?.value).toBe(3000);
  });

  test("returns only enabled audiobookshelf stats", () => {
    const result = getVisibleStats(
      "audiobookshelf",
      {
        showLibraryCount: true,
        showAudiobooks: true,
        showPodcasts: false,
        showListeningTime: false,
        showActiveSessions: true,
      },
      audiobookshelfStats,
    );
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.statKey)).toEqual(["libraryCount", "audiobooks", "activeSessions"]);
  });

  test("returns empty array when all options disabled", () => {
    const result = getVisibleStats("navidrome", {}, navidromeStats);
    expect(result).toEqual([]);
  });

  test("returns every backend-relevant stat when advanced disclosure is enabled", () => {
    expect(getVisibleStats("navidrome", {}, navidromeStats, true).map((stat) => stat.statKey)).toEqual([
      "artists",
      "albums",
      "songs",
    ]);
    expect(getVisibleStats("audiobookshelf", {}, audiobookshelfStats, true).map((stat) => stat.statKey)).toEqual([
      "libraryCount",
      "audiobooks",
      "podcasts",
      "listeningTime",
      "activeSessions",
    ]);
  });

  test("formats listening time as duration string", () => {
    const result = getVisibleStats("audiobookshelf", { showListeningTime: true }, audiobookshelfStats);
    expect(result).toHaveLength(1);
    expect(typeof result[0]?.value).toBe("string");
  });
});
