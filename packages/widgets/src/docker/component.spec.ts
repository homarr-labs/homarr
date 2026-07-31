import { describe, expect, test } from "vitest";

import { parseColumnOrder, parseColumnWidths } from "../common/use-persisted-table-layout";

const columnAccessors = ["name", "state", "host", "cpuUsage", "memoryUsage", "actions"];

describe("Docker table column layout options", () => {
  test("ignores malformed column layout JSON", () => {
    expect(parseColumnOrder("{", columnAccessors)).toEqual([]);
    expect(parseColumnWidths("[]", columnAccessors)).toEqual({});
  });

  test("removes stale and duplicate column accessors", () => {
    expect(
      parseColumnOrder(JSON.stringify(["memoryUsage", "removed", "name", "memoryUsage"]), columnAccessors),
    ).toEqual(["memoryUsage", "name"]);
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
        columnAccessors,
      ),
    ).toEqual({ name: 180 });
  });
});
