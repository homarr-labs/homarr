import { describe, expect, test } from "vitest";

import { getGridCols, getIconSize, getVisibleBazarrStatKeys } from "./component";

describe("Bazarr responsive layout", () => {
  test("uses two columns for a short widget so all stats remain visible", () => {
    expect(getGridCols(220, 100, 4)).toBe(2);
  });

  test("uses four columns in a wide advanced surface", () => {
    expect(getGridCols(800, 400, 4)).toBe(4);
  });

  test("sizes icons from the constrained dimension", () => {
    expect(getIconSize(180)).toBe(16);
    expect(getIconSize(340)).toBe(22);
  });

  test("advanced mode includes hidden summaries and all fetched status fields", () => {
    expect(
      getVisibleBazarrStatKeys(
        {
          showMissingEpisodes: false,
          showMissingMovies: false,
          showProviderIssues: false,
          showHealthIssues: false,
        },
        "advanced",
      ),
    ).toEqual(["episodes", "movies", "providers", "status", "sonarrSignalr", "radarrSignalr", "announcements"]);
  });
});
