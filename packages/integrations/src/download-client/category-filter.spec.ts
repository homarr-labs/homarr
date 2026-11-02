import { describe, expect, test } from "vitest";

import { matchesDownloadCategoryFilter } from "./category-filter";

describe("matchesDownloadCategoryFilter", () => {
  test("keeps a job whose category matches, ignoring case and surrounding spaces", () => {
    expect(matchesDownloadCategoryFilter("Radarr", [" radarr ", "sonarr"], true)).toBe(true);
    expect(matchesDownloadCategoryFilter(["tv", "Sonarr"], ["sonarr"], true)).toBe(true);
  });

  test("hides a categorized job that is not in the whitelist", () => {
    expect(matchesDownloadCategoryFilter("movies", ["sonarr", "radarr"], true)).toBe(false);
  });

  test("keeps jobs without a category so clients that cannot categorize stay visible", () => {
    for (const category of [undefined, null, "", "   ", []] as const) {
      expect(matchesDownloadCategoryFilter(category, ["sonarr", "radarr"], true)).toBe(true);
    }
  });

  test("does not hide matching categories when the list is not a whitelist", () => {
    expect(matchesDownloadCategoryFilter("radarr", ["sonarr", "radarr"], false)).toBe(true);
    expect(matchesDownloadCategoryFilter("movies", ["sonarr", "radarr"], false)).toBe(true);
    expect(matchesDownloadCategoryFilter(undefined, ["sonarr"], false)).toBe(true);
  });

  test("shows every job when the category list is empty", () => {
    expect(matchesDownloadCategoryFilter("radarr", [], true)).toBe(true);
    expect(matchesDownloadCategoryFilter("radarr", ["  "], true)).toBe(true);
  });
});
