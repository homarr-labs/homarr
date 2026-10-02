import { describe, expect, test } from "vitest";

import { getGridDepth } from "../grid-depth";

describe("grid depth", () => {
  test("follows the registered parent chain for deeply nested grids", () => {
    const parents = new Map<string, string | null>([
      ["root", null],
      ["first", "root"],
      ["second", "first"],
      ["third", "second"],
    ]);

    expect(getGridDepth("root", parents)).toBe(0);
    expect(getGridDepth("third", parents)).toBe(3);
  });

  test("stops safely when malformed parent data contains a cycle", () => {
    const parents = new Map<string, string | null>([
      ["first", "second"],
      ["second", "first"],
    ]);

    expect(getGridDepth("first", parents)).toBe(1);
  });
});
