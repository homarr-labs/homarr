// @vitest-environment node

import { describe, expect, test } from "vitest";

import type { FixtureGeometry } from "./geometry.mts";
import { findFixtureGeometryErrors } from "./geometry.mts";

const baseGeometry = (): FixtureGeometry => ({
  layouts: [
    {
      id: "layout-mobile",
      boardId: "board",
      columnCount: 3,
      leftGutterColumnCount: 0,
      rightGutterColumnCount: 0,
      role: "mobile",
    },
  ],
  sections: [
    { id: "root", boardId: "board", kind: "empty", xOffset: 0 },
    { id: "level-1", boardId: "board", kind: "container", xOffset: null },
    { id: "level-2", boardId: "board", kind: "container", xOffset: null },
    { id: "level-3", boardId: "board", kind: "container", xOffset: null },
  ],
  sectionLayouts: [
    {
      sectionId: "level-1",
      layoutId: "layout-mobile",
      parentSectionId: "root",
      xOffset: 0,
      yOffset: 0,
      width: 3,
      height: 6,
    },
    {
      sectionId: "level-2",
      layoutId: "layout-mobile",
      parentSectionId: "level-1",
      xOffset: 0,
      yOffset: 0,
      width: 2,
      height: 5,
    },
    {
      sectionId: "level-3",
      layoutId: "layout-mobile",
      parentSectionId: "level-2",
      xOffset: 0,
      yOffset: 0,
      width: 1,
      height: 4,
    },
  ],
  itemLayouts: [
    {
      itemId: "nested-item",
      boardId: "board",
      sectionId: "level-3",
      layoutId: "layout-mobile",
      xOffset: 0,
      yOffset: 0,
      width: 1,
      height: 2,
    },
  ],
});

describe("release-v2 QA fixture geometry", () => {
  test("rejects an item that fits total columns but overflows the gutter-reduced main lane", () => {
    const geometry = baseGeometry();
    geometry.layouts[0] = {
      id: "layout-mobile",
      boardId: "board",
      role: "base",
      columnCount: 12,
      leftGutterColumnCount: 2,
      rightGutterColumnCount: 2,
    };
    geometry.sections = [{ id: "root", boardId: "board", kind: "empty", xOffset: 0 }];
    geometry.sectionLayouts = [];
    geometry.itemLayouts = [
      {
        itemId: "gutter-overflow",
        boardId: "board",
        sectionId: "root",
        layoutId: "layout-mobile",
        xOffset: 0,
        yOffset: 0,
        width: 9,
        height: 1,
      },
    ];

    expect(findFixtureGeometryErrors(geometry)).toContain(
      "item gutter-overflow in layout layout-mobile exceeds its 8-column parent lane",
    );
  });

  test("accepts valid three-level mobile nesting and rejects a child wider than its container", () => {
    const geometry = baseGeometry();
    expect(findFixtureGeometryErrors(geometry)).toEqual([]);

    const nestedItem = geometry.itemLayouts.at(0);
    if (!nestedItem) throw new Error("Missing nested fixture item");
    nestedItem.width = 2;
    expect(findFixtureGeometryErrors(geometry)).toContain(
      "item nested-item in layout layout-mobile exceeds its 1-column parent container",
    );
  });

  test("rejects recursive container parent cycles", () => {
    const geometry = baseGeometry();
    const firstSection = geometry.sectionLayouts.at(0);
    if (!firstSection) throw new Error("Missing nested fixture section");
    firstSection.parentSectionId = "level-3";

    expect(findFixtureGeometryErrors(geometry).some((error) => error.includes("container cycle"))).toBe(true);
  });
});
