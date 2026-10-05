import { describe, expect, test } from "vitest";

import { definition } from ".";

describe("Downloads widget history options", () => {
  test.each([1, 7, 14, 28])("accepts an arbitrary %i-day window", (days) => {
    const options = definition.createOptions();
    expect(options.historyWindowDays.validate.safeParse(days).success).toBe(true);
  });

  test.each([0, -1, 1.5, "7"])("rejects an invalid day window %s", (days) => {
    const options = definition.createOptions();
    expect(options.historyWindowDays.validate.safeParse(days).success).toBe(false);
  });

  test("only matches results for its own archive settings", () => {
    const input = {
      integrationIds: ["sabnzbd-1"],
      limitPerIntegration: 50,
      includeArchivedHistory: true,
      historyWindowDays: 7,
    };
    const scope = {
      itemId: "widget-1",
      boardId: "board-1",
      integrationIds: input.integrationIds,
      options: input,
      runtimeQueries: [],
    };
    const query = { path: ["widget", "downloads", "getJobsAndStatuses"], input };

    expect(definition.queryMatcher(query, scope)).toBe(true);
    expect(definition.queryMatcher({ ...query, input: { ...input, historyWindowDays: 14 } }, scope)).toBe(false);
    expect(definition.queryMatcher({ ...query, input: { ...input, includeArchivedHistory: false } }, scope)).toBe(
      false,
    );
  });
});
