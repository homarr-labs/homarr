import { describe, expect, test } from "vitest";

import {
  doGridPlacementsOverlap,
  getCollapsedDisplayLayout,
  placeGridItem,
  reflowVerticalLayout,
  sortGridPlacementsForReadingOrder,
} from "../index";
import type { GridPlacement } from "../index";

describe("dashboard layout reflow", () => {
  test("compacts each horizontal lane and removes collisions", () => {
    const result = reflowVerticalLayout(
      [
        { id: "a", x: 0, y: 0, w: 1, h: 1 },
        { id: "b", x: 0, y: 3, w: 1, h: 1 },
        { id: "c", x: 1, y: 3, w: 1, h: 1 },
      ],
      { columnCount: 2 },
    );

    expect(result).toEqual([
      { id: "a", x: 0, y: 0, w: 1, h: 1 },
      { id: "b", x: 0, y: 1, w: 1, h: 1 },
      { id: "c", x: 1, y: 0, w: 1, h: 1 },
    ]);
    expect(hasOverlap(result)).toBe(false);
  });

  test("shrinks a collapsed inline container without compacting unrelated columns", () => {
    const result = getCollapsedDisplayLayout(
      [
        { id: "section", x: 0, y: 0, w: 2, h: 3 },
        { id: "below", x: 0, y: 3, w: 2, h: 1 },
        { id: "other-lane", x: 2, y: 4, w: 1, h: 1 },
      ],
      {
        columnCount: 3,
        collapsedItemIds: new Set(["section"]),
      },
    );

    expect(result).toEqual([
      { id: "section", x: 0, y: 0, w: 2, h: 0.5 },
      { id: "below", x: 0, y: 0.5, w: 2, h: 1 },
      { id: "other-lane", x: 2, y: 4, w: 1, h: 1 },
    ]);
  });

  test("preserves intentional gaps below a collapsed container", () => {
    const result = getCollapsedDisplayLayout(
      [
        { id: "section", x: 0, y: 1, w: 2, h: 3 },
        { id: "below", x: 0, y: 6, w: 2, h: 1 },
        { id: "above", x: 0, y: 0, w: 2, h: 1 },
      ],
      { columnCount: 2, collapsedItemIds: new Set(["section"]) },
    );

    expect(result).toEqual([
      { id: "section", x: 0, y: 1, w: 2, h: 0.5 },
      { id: "below", x: 0, y: 3.5, w: 2, h: 1 },
      { id: "above", x: 0, y: 0, w: 2, h: 1 },
    ]);
  });

  test("does not double-count side-by-side collapsed space", () => {
    const result = getCollapsedDisplayLayout(
      [
        { id: "left", x: 0, y: 0, w: 1, h: 3 },
        { id: "right", x: 1, y: 0, w: 1, h: 3 },
        { id: "below", x: 0, y: 3, w: 2, h: 1 },
      ],
      { columnCount: 2, collapsedItemIds: new Set(["left", "right"]) },
    );

    expect(result).toEqual([
      { id: "left", x: 0, y: 0, w: 1, h: 0.5 },
      { id: "right", x: 1, y: 0, w: 1, h: 0.5 },
      { id: "below", x: 0, y: 0.5, w: 2, h: 1 },
    ]);
  });

  test("pins a moved or expanded item and pushes collisions out of the way", () => {
    const result = placeGridItem(
      [
        { id: "section", x: 0, y: 0, w: 2, h: 1 },
        { id: "neighbor", x: 0, y: 1, w: 2, h: 1 },
        { id: "side", x: 2, y: 2, w: 1, h: 1 },
      ],
      { id: "section", x: 0, y: 0, w: 2, h: 3 },
      3,
    );

    expect(result).toEqual([
      { id: "section", x: 0, y: 0, w: 2, h: 3 },
      { id: "neighbor", x: 0, y: 3, w: 2, h: 1 },
      { id: "side", x: 2, y: 0, w: 1, h: 1 },
    ]);
    expect(hasOverlap(result)).toBe(false);
  });

  test("is deterministic regardless of input array order", () => {
    const first = [
      { id: "b", x: 0, y: 2, w: 1, h: 1 },
      { id: "a", x: 0, y: 2, w: 1, h: 1 },
      { id: "c", x: 1, y: 8, w: 1, h: 1 },
    ];
    const second = first.toReversed();

    expect(byId(reflowVerticalLayout(first, { columnCount: 2 }))).toEqual(
      byId(reflowVerticalLayout(second, { columnCount: 2 })),
    );
  });

  test("provides row-major DOM order for the read-only renderer", () => {
    const items = [
      { id: "last", x: 0, y: 2, w: 1, h: 1 },
      { id: "right", x: 1, y: 0, w: 1, h: 1 },
      { id: "left", x: 0, y: 0, w: 1, h: 1 },
    ];

    expect(sortGridPlacementsForReadingOrder(items).map((item) => item.id)).toEqual(["left", "right", "last"]);
  });
});

const hasOverlap = (placements: readonly GridPlacement[]) =>
  placements.some((placement, index) =>
    placements.slice(index + 1).some((otherPlacement) => doGridPlacementsOverlap(placement, otherPlacement)),
  );

const byId = (placements: readonly GridPlacement[]) =>
  Object.fromEntries(placements.map((placement) => [placement.id, placement]));
