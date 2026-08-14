import { describe, expect, test } from "vitest";

import {
  DOWNLOAD_COLUMN_ACCESSORS,
  filterDownloadItemsByStatus,
  getAvailableDownloadStates,
  getDownloadColumnAccessors,
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
  test("uses every column in advanced mode without changing the compact selection", () => {
    expect(getDownloadColumnAccessors(["name"], true)).toEqual(DOWNLOAD_COLUMN_ACCESSORS);
    expect(getDownloadColumnAccessors(["name"], false)).toEqual(["name"]);
  });
});
