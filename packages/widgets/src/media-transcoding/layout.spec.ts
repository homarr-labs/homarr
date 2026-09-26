import { describe, expect, test } from "vitest";

import { resolveQueuePagination } from "./component";
import { toRingProgressSections } from "./panels/statistics.panel";

describe("media transcoding layout", () => {
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
