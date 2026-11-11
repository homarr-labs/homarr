import { describe, expect, test } from "vitest";

import { BoardMockBuilder } from "~/components/board/items/actions/test/mocks/board-mock";
import { ContainerSectionMockBuilder } from "~/components/board/items/actions/test/mocks/container-section-mock";
import { ItemMockBuilder } from "~/components/board/items/actions/test/mocks/item-mock";
import { LOGICAL_GRID_PITCH } from "~/components/board/layout";
import { getContainerGridMinimumHeights } from "../container-grid-sizing";
import { createGridRowProjection } from "../grid-row-projection";

const sizingCases = Array.from({ length: 24 }, (_, index) => index + 1).flatMap((columnCount) =>
  [0.25, 0.5, 1, 1.5].map((canvasScale) => ({ columnCount, canvasScale })),
);

describe("category header spacing", () => {
  test("projects fractional header space without changing saved rows", () => {
    const placements = [
      { id: "category", x: 0, y: 0, w: 2, h: 1 },
      { id: "following", x: 0, y: 1, w: 1, h: 1 },
    ];
    const saved = structuredClone(placements);
    const projection = createGridRowProjection(placements, new Map([["category", 1.25]]));

    expect(projection.placements[0]?.h).toBe(1.25);
    expect(projection.placements[1]?.y).toBe(1.25);
    expect(projection.getDisplayRow(1)).toBe(1.25);
    expect(projection.getLogicalRow(1.1)).toBe(1);
    expect(projection.getLogicalRow(1.75)).toBe(1.5);
    for (const row of [0, 0.25, 0.75, 1, 1.5, 2, 6]) {
      expect(projection.getLogicalRow(projection.getDisplayRow(row))).toBeCloseTo(row, 8);
    }
    expect(placements).toEqual(saved);
  });

  test.each(sizingCases)(
    "reserves exact nested headers at $columnCount columns and $canvasScale scale",
    ({ columnCount, canvasScale }) => {
      const layoutId = "layout";
      const innerColumns = Math.max(1, Math.floor(columnCount / 2));
      const outer = new ContainerSectionMockBuilder({
        id: "outer",
        options: { title: "Outer", collapsible: true, showLabel: true },
      })
        .addLayout({ layoutId, parentSectionId: "root", width: columnCount })
        .build();
      const inner = new ContainerSectionMockBuilder({
        id: "inner",
        options: { title: "Inner", collapsible: true, showLabel: true },
      })
        .addLayout({ layoutId, parentSectionId: "outer", width: innerColumns })
        .build();
      const board = new BoardMockBuilder()
        .addLayout({ id: layoutId, columnCount })
        .addEmptySection({ id: "root" })
        .addSection(outer)
        .addSection(inner)
        .addItem(new ItemMockBuilder().addLayout({ layoutId, sectionId: "inner" }).build())
        .build();
      const saved = structuredClone(board);
      const minimumHeights = getContainerGridMinimumHeights(board, layoutId, canvasScale, new Set());
      const projection = createGridRowProjection(
        [
          { id: "outer", x: 0, y: 0, w: columnCount, h: 1 },
          { id: "following", x: 0, y: 1, w: 1, h: 1 },
        ],
        minimumHeights,
      );

      // Each card removes 5px on either side from its grid width. Its header
      // and vertical insets add 48px + 10px, independently of column count.
      const innerRowPixels = LOGICAL_GRID_PITCH * canvasScale - 10 / columnCount - 10 / innerColumns;
      const expectedHeightPixels = innerRowPixels + 2 * 58;
      expect((minimumHeights.get("outer") ?? 0) * LOGICAL_GRID_PITCH * canvasScale).toBeCloseTo(
        expectedHeightPixels,
        6,
      );
      expect((projection.placements[1]?.y ?? 0) * LOGICAL_GRID_PITCH * canvasScale).toBeCloseTo(
        expectedHeightPixels,
        6,
      );
      expect(board).toEqual(saved);
    },
  );
});
