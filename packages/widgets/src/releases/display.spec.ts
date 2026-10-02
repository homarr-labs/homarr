import { describe, expect, test } from "vitest";

import { selectReleaseRepositoriesForDisplay } from "./display";

const repositories = [
  { id: "ordinary", isNewRelease: false, isStaleRelease: false },
  { id: "new", isNewRelease: true, isStaleRelease: false },
  { id: "stale", isNewRelease: false, isStaleRelease: true },
  { id: "error", error: { code: "provider" } },
];

describe("selectReleaseRepositoriesForDisplay", () => {
  test("applies highlight and top limits in compact mode", () => {
    const result = selectReleaseRepositoriesForDisplay(repositories, {
      displayMode: "compact",
      showOnlyHighlighted: true,
      topReleases: 2,
    });

    expect(result.map(({ id }) => id)).toEqual(["new", "stale"]);
  });

  test("keeps every configured repository in advanced mode", () => {
    const result = selectReleaseRepositoriesForDisplay(repositories, {
      displayMode: "advanced",
      showOnlyHighlighted: true,
      topReleases: 1,
    });

    expect(result.map(({ id }) => id)).toEqual(["ordinary", "new", "stale", "error"]);
  });
});
