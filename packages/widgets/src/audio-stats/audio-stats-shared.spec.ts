import { describe, expect, test } from "vitest";

import type { AudiobookshelfDashboardData, NavidromeDashboardData } from "@homarr/integrations/types";

import { getGridCols, getIconSize, getVisibleStats } from "./shared";

describe("getGridCols", () => {
  test("caps columns to visible stat count", () => {
    expect(getGridCols(500, 2, false)).toBe(2);
  });

  test("returns max cols when many stats visible", () => {
    expect(getGridCols(500, 10, false)).toBe(5);
  });

  test("compact mode uses smaller breakpoints", () => {
    expect(getGridCols(290, 5, true)).toBe(5);
    expect(getGridCols(290, 5, false)).toBe(2);
  });

  test("returns at least 1 col even with 0 visible stats", () => {
    expect(getGridCols(500, 0, false)).toBe(1);
  });
});

describe("getIconSize", () => {
  test("returns large size for wide container", () => {
    expect(getIconSize(400, false)).toBe(22);
  });

  test("returns compact size for narrow container in compact mode", () => {
    expect(getIconSize(100, true)).toBe(14);
  });

  test("returns fallback for very narrow non-compact container", () => {
    expect(getIconSize(50, false)).toBe(16);
  });
});

describe("getVisibleStats", () => {
  const navidromeStats: NavidromeDashboardData = {
    artistCount: 100,
    albumCount: 200,
    songCount: 3000,
    nowPlaying: [],
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

  test("formats listening time as duration string", () => {
    const result = getVisibleStats("audiobookshelf", { showListeningTime: true }, audiobookshelfStats);
    expect(result).toHaveLength(1);
    expect(typeof result[0]?.value).toBe("string");
  });
});
