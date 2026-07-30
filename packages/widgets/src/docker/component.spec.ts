import { describe, expect, test } from "vitest";

import { parseColumnOrder, parseColumnWidths } from "./component";

describe("Docker table column layout options", () => {
  test("ignores malformed column layout JSON", () => {
    expect(parseColumnOrder("{")).toEqual([]);
    expect(parseColumnWidths("[]")).toEqual({});
  });

  test("removes stale and duplicate column accessors", () => {
    expect(parseColumnOrder(JSON.stringify(["memoryUsage", "removed", "name", "memoryUsage"]))).toEqual([
      "memoryUsage",
      "name",
    ]);
  });

  test("keeps only finite positive widths for known columns", () => {
    expect(
      parseColumnWidths(
        JSON.stringify({
          name: 180,
          state: -1,
          host: "120px",
          removed: 100,
          actions: null,
        }),
      ),
    ).toEqual({ name: 180 });
  });
});
