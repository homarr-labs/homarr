import { describe, expect, test } from "vitest";

import { getReleasesQueryStaleTimeMs } from "./query-options";

describe("getReleasesQueryStaleTimeMs", () => {
  test("keeps successful release batches fresh for four hours", () => {
    const staleTime = getReleasesQueryStaleTimeMs({
      state: { data: [{ success: true }, { success: true }] },
    });

    expect(staleTime).toBe(4 * 60 * 60 * 1000);
  });

  test("keeps a batch stale when a provider returned an error", () => {
    const staleTime = getReleasesQueryStaleTimeMs({
      state: { data: [{ success: true }, { success: false }] },
    });

    expect(staleTime).toBe(0);
  });

  test.each([undefined, [], [{ unexpected: true }]])("keeps missing or invalid data stale", (data) => {
    expect(getReleasesQueryStaleTimeMs({ state: { data } })).toBe(0);
  });
});
