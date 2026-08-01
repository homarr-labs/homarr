import { describe, expect, test } from "vitest";

import { getQueuePageSize, resolveQueuePagination } from "./component";
import { toRingProgressSections } from "./panels/statistics.panel";

describe("media transcoding layout", () => {
  test("keeps compact queues bounded to the available height", () => {
    expect(getQueuePageSize(140, false)).toBe(3);
    expect(getQueuePageSize(500, false)).toBe(14);
    expect(getQueuePageSize(2000, false)).toBe(15);
  });

  test("loads a bounded deeper queue in advanced mode", () => {
    expect(getQueuePageSize(200, true)).toBe(25);
  });

  test("resets the queue when display mode or page size changes", () => {
    const compact = { page: 7, pageSize: 10, isAdvanced: false };

    expect(resolveQueuePagination(compact, 25, true, 8)).toEqual({ page: 1, pageSize: 25, isAdvanced: true });
    expect(resolveQueuePagination(compact, 12, false, 8)).toEqual({ page: 1, pageSize: 12, isAdvanced: false });
  });

  test("clamps the queue page when the result count shrinks", () => {
    expect(resolveQueuePagination({ page: 7, pageSize: 10, isAdvanced: false }, 10, false, 3)).toEqual({
      page: 3,
      pageSize: 10,
      isAdvanced: false,
    });
  });

  test("does not create NaN chart sections for empty statistics", () => {
    expect(toRingProgressSections([{ name: "none", value: 0 }])).toEqual([]);
  });
});
