import { describe, expect, test } from "vitest";

import { parseColumnOrder, parseColumnWidths } from "./component";

describe("Beszel table column layout options", () => {
  test("ignores malformed column layout JSON", () => {
    expect(parseColumnOrder("{")).toEqual([]);
    expect(parseColumnWidths("[]")).toEqual({});
  });

  test("removes stale and duplicate column accessors", () => {
    expect(parseColumnOrder(JSON.stringify(["memory", "removed", "cpu", "memory"]))).toEqual(["memory", "cpu"]);
  });

  test("keeps only finite positive widths for known columns", () => {
    expect(
      parseColumnWidths(
        JSON.stringify({
          cpu: 140,
          memory: -1,
          disk: "160px",
          removed: 100,
          temp: null,
        }),
      ),
    ).toEqual({ cpu: 140 });
  });
});
