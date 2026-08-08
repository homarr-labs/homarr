import { describe, expect, test } from "vitest";

import { filterRecursiveInnerSections } from "./gridstack";

describe("filterRecursiveInnerSections", () => {
  test("removes sections that would recursively render an ancestor", () => {
    const innerSections = [{ id: "safe" }, { id: "parent" }, { id: "root" }];

    expect(filterRecursiveInnerSections(innerSections, new Set(["root", "parent"]))).toEqual([{ id: "safe" }]);
  });
});
