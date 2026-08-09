import { describe, expect, test } from "vitest";

import { filterDownloadItemsByStatus, getAvailableDownloadStates } from "./helpers";

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
