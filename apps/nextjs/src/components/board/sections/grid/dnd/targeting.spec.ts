import { describe, expect, test } from "vitest";

import type { GridTargetGeometry } from "./targeting";
import { getGridTargetFallbackIds, getPreferredNestedExitTargetId } from "./targeting";

const grid = (
  id: string,
  rectangle: GridTargetGeometry["rectangle"],
  parentGridId: string | null = null,
): GridTargetGeometry => ({ id, parentGridId, rectangle });

const alwaysEligible = () => true;

describe("nested grid exit targeting", () => {
  const grids = [
    grid("canvas", { left: 0, top: 0, width: 1200, height: 800 }),
    grid("container", { left: 200, top: 100, width: 600, height: 500 }, "canvas"),
  ];

  test("keeps the nested grid while most of a large item remains inside", () => {
    expect(
      getPreferredNestedExitTargetId({
        grids,
        pointerTargetId: "container",
        sourceGridId: "container",
        dragShape: { left: 100, top: 150, width: 400, height: 200 },
        isEligible: alwaysEligible,
      }),
    ).toBe("container");
  });

  test("selects the parent before the pointer leaves when most of the item is outside", () => {
    expect(
      getPreferredNestedExitTargetId({
        grids,
        pointerTargetId: "container",
        sourceGridId: "container",
        dragShape: { left: 0, top: 150, width: 400, height: 200 },
        isEligible: alwaysEligible,
      }),
    ).toBe("canvas");
  });

  test("preserves a sibling container selected by the pointer", () => {
    const withSibling = [...grids, grid("sibling", { left: 820, top: 100, width: 300, height: 500 }, "canvas")];
    expect(
      getPreferredNestedExitTargetId({
        grids: withSibling,
        pointerTargetId: "sibling",
        sourceGridId: "container",
        dragShape: { left: 820, top: 150, width: 300, height: 200 },
        isEligible: alwaysEligible,
      }),
    ).toBe("sibling");
  });

  test("does not escape to an ineligible parent", () => {
    expect(
      getPreferredNestedExitTargetId({
        grids,
        pointerTargetId: "container",
        sourceGridId: "container",
        dragShape: { left: 0, top: 150, width: 400, height: 200 },
        isEligible: (gridId) => gridId !== "canvas",
      }),
    ).toBe("container");
  });
});

describe("nested grid fallback targeting", () => {
  const grids = [
    grid("canvas", { left: 0, top: 0, width: 1200, height: 800 }),
    grid("container", { left: 200, top: 100, width: 600, height: 500 }, "canvas"),
  ];

  test("falls back from a blocked container to its parent canvas", () => {
    expect(
      getGridTargetFallbackIds({
        grids,
        targetGridId: "container",
        isEligible: alwaysEligible,
      }),
    ).toEqual(["container", "canvas"]);
  });

  test("does not cross an ineligible hierarchy boundary", () => {
    expect(
      getGridTargetFallbackIds({
        grids,
        targetGridId: "container",
        isEligible: (gridId) => gridId !== "canvas",
      }),
    ).toEqual(["container"]);
  });
});
