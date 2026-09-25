import { describe, expect, test } from "vitest";

import { getItemCountBucket, isSnapshotDue, omitZeroCounts } from "./snapshot-properties";

describe("snapshot properties", () => {
  test("waits seven full days after a successful report", () => {
    const now = new Date("2026-09-25T00:00:00.000Z");

    expect(isSnapshotDue(null, now)).toBe(true);
    expect(isSnapshotDue("2026-09-18T00:00:00.001Z", now)).toBe(false);
    expect(isSnapshotDue("2026-09-18T00:00:00.000Z", now)).toBe(true);
    expect(isSnapshotDue("2026-09-26T00:00:00.000Z", now)).toBe(false);
  });

  test("buckets board sizes and omits zero-valued counts", () => {
    expect([0, 1, 2, 3, 4, 7, 8, 15, 16].map(getItemCountBucket)).toEqual([
      "empty",
      "one",
      "two-to-three",
      "two-to-three",
      "four-to-seven",
      "four-to-seven",
      "eight-to-fifteen",
      "eight-to-fifteen",
      "sixteen-plus",
    ]);
    expect(omitZeroCounts({ countBoards: 0, countWidgets: 2, boardsWithItemCount_empty: 1 })).toEqual({
      countWidgets: 2,
      boardsWithItemCount_empty: 1,
    });
  });
});
