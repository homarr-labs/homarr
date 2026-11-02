import { describe, expect, test } from "vitest";

import { getInitialPendingReleaseIds, isReleasesInitialLoading } from "./loading";

const pending = (repositoryIds: string[]) => ({
  repositoryIds,
  data: undefined,
  error: null,
  isPending: true,
});

describe("release widget loading", () => {
  test("keeps the full loader while every batch is still pending", () => {
    const pendingIds = getInitialPendingReleaseIds([pending(["one"]), pending(["two"])]);

    expect([...pendingIds]).toEqual(["one", "two"]);
    expect(isReleasesInitialLoading(pendingIds, 0)).toBe(true);
  });

  test("does not blank the widget when another batch already has data", () => {
    const pendingIds = getInitialPendingReleaseIds([
      { repositoryIds: ["cached"], data: [{ id: "cached", success: true }], error: null, isPending: false },
      pending(["changed"]),
    ]);

    expect([...pendingIds]).toEqual(["changed"]);
    expect(isReleasesInitialLoading(pendingIds, 1)).toBe(false);
  });

  test("treats placeholder data from the previous settings as ready to render", () => {
    const pendingIds = getInitialPendingReleaseIds([
      { repositoryIds: ["repo"], data: [{ id: "repo", success: true }], error: null, isPending: false },
    ]);

    expect(pendingIds.size).toBe(0);
    expect(isReleasesInitialLoading(pendingIds, 1)).toBe(false);
  });

  test("leaves a finished error visible instead of spinning", () => {
    const pendingIds = getInitialPendingReleaseIds([
      { repositoryIds: ["repo"], data: undefined, error: new Error("offline"), isPending: true },
    ]);

    expect(pendingIds.size).toBe(0);
    expect(isReleasesInitialLoading(pendingIds, 1)).toBe(false);
  });
});
