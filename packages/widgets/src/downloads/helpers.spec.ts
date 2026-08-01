import { describe, expect, test } from "vitest";

import { columnWidthsToRecord, filterDownloadItemsByStatus, getAvailableDownloadStates } from "./helpers";

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

describe("downloads column widths", () => {
  test("serializes numeric and pixel widths while ignoring automatic widths", () => {
    expect(columnWidthsToRecord([{ name: 240 }, { progress: "120px" }, { state: "auto" }])).toEqual({
      name: 240,
      progress: 120,
    });
  });
});
