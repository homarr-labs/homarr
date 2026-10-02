import { describe, expect, test } from "vitest";

import {
  ADVANCED_DOWNLOAD_COLUMN_ACCESSORS,
  filterDownloadItemsByStatus,
  getAvailableDownloadStates,
  getDownloadColumnAccessors,
  getDownloadsStatsDisplay,
} from "./helpers";

describe("downloads filters", () => {
  const eligibleItems = [{ state: "downloading" as const }, { state: "seeding" as const }];

  test("keeps all eligible statuses available after applying a status filter", () => {
    expect(filterDownloadItemsByStatus(eligibleItems, ["downloading"])).toEqual([{ state: "downloading" }]);
    expect(getAvailableDownloadStates(eligibleItems)).toEqual(["downloading", "seeding"]);
  });

  test("deduplicates available statuses", () => {
    expect(getAvailableDownloadStates([...eligibleItems, { state: "downloading" }])).toEqual([
      "downloading",
      "seeding",
    ]);
  });
});

describe("downloads advanced columns", () => {
  test("uses summary columns in advanced mode without changing the compact selection", () => {
    expect(getDownloadColumnAccessors(["name"], true)).toEqual(ADVANCED_DOWNLOAD_COLUMN_ACCESSORS);
    expect(getDownloadColumnAccessors(["name"], false)).toEqual(["name"]);
  });
});

describe("downloads stats display", () => {
  test("keeps advanced stats independent from the compact toggle", () => {
    const compactStatsVisible = false;

    expect(
      [true, false, true, false].map((isAdvanced) => getDownloadsStatsDisplay(compactStatsVisible, isAdvanced)),
    ).toEqual([
      { visible: true, canToggle: false },
      { visible: false, canToggle: true },
      { visible: true, canToggle: false },
      { visible: false, canToggle: true },
    ]);
  });

  test("preserves an explicitly enabled compact stats bar", () => {
    expect(getDownloadsStatsDisplay(true, false)).toEqual({ visible: true, canToggle: true });
  });
});
