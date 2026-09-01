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
  test("rejects exact duplicate item placements in the same section", () => {
    const geometry = baseGeometry();
    geometry.itemLayouts.push({
      itemId: "duplicate-item",
      boardId: "board",
      sectionId: "level-3",
      layoutId: "layout-mobile",
      xOffset: 0,
      yOffset: 0,
      width: 1,
      height: 2,
    });

    expect(findFixtureGeometryErrors(geometry)).toContain(
      "item duplicate-item overlaps item nested-item in layout layout-mobile section level-3",
    );
  });

  test("rejects partial item overlaps in the same section", () => {
    const geometry = baseGeometry();
    geometry.sections = [{ id: "root", boardId: "board", kind: "empty", xOffset: 0 }];
    geometry.sectionLayouts = [];
    geometry.itemLayouts = [
      {
        itemId: "first-item",
        boardId: "board",
        sectionId: "root",
        layoutId: "layout-mobile",
        xOffset: 0,
        yOffset: 0,
        width: 2,
        height: 2,
      },
      {
        itemId: "second-item",
        boardId: "board",
        sectionId: "root",
        layoutId: "layout-mobile",
        xOffset: 1,
        yOffset: 1,
        width: 2,
        height: 2,
      },
    ];

    expect(findFixtureGeometryErrors(geometry)).toContain(
      "item first-item overlaps item second-item in layout layout-mobile section root",
    );
  });

  test("accepts tightly packed items that only share edges", () => {
    const geometry = baseGeometry();
    geometry.sections = [{ id: "root", boardId: "board", kind: "empty", xOffset: 0 }];
    geometry.sectionLayouts = [];
    geometry.itemLayouts = [
      {
        itemId: "top-left",
        boardId: "board",
        sectionId: "root",
        layoutId: "layout-mobile",
        xOffset: 0,
        yOffset: 0,
        width: 1,
        height: 2,
      },
      {
        itemId: "top-right",
        boardId: "board",
        sectionId: "root",
        layoutId: "layout-mobile",
        xOffset: 1,
        yOffset: 0,
        width: 2,
        height: 2,
      },
      {
        itemId: "bottom",
        boardId: "board",
        sectionId: "root",
        layoutId: "layout-mobile",
        xOffset: 0,
        yOffset: 2,
        width: 3,
        height: 1,
      },
    ];

    expect(findFixtureGeometryErrors(geometry)).toEqual([]);
  });

  test("does not compare local coordinates from different parent sections", () => {
    const geometry = baseGeometry();
    geometry.sections = [
      { id: "root", boardId: "board", kind: "empty", xOffset: 0 },
      { id: "left-container", boardId: "board", kind: "container", xOffset: null },
      { id: "right-container", boardId: "board", kind: "container", xOffset: null },
    ];
    geometry.sectionLayouts = [
      {
        sectionId: "left-container",
        layoutId: "layout-mobile",
        parentSectionId: "root",
        xOffset: 0,
        yOffset: 0,
        width: 1,
        height: 2,
      },
      {
        sectionId: "right-container",
        layoutId: "layout-mobile",
        parentSectionId: "root",
        xOffset: 1,
        yOffset: 0,
        width: 2,
        height: 2,
      },
    ];
    geometry.itemLayouts = [
      {
        itemId: "left-item",
        boardId: "board",
        sectionId: "left-container",
        layoutId: "layout-mobile",
        xOffset: 0,
        yOffset: 0,
        width: 1,
        height: 1,
      },
      {
        itemId: "right-item",
        boardId: "board",
        sectionId: "right-container",
        layoutId: "layout-mobile",
        xOffset: 0,
        yOffset: 0,
        width: 1,
        height: 1,
      },
    ];

    expect(findFixtureGeometryErrors(geometry)).toEqual([]);
  });

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
