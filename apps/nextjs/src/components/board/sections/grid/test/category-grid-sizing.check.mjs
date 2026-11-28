// From the repository root:
// TSX_TSCONFIG_PATH=apps/nextjs/tsconfig.json node --import tsx apps/nextjs/src/components/board/sections/grid/test/category-grid-sizing.check.mjs
import assert from "node:assert/strict";

import { getContainerGridMinimumHeights } from "../container-grid-sizing.ts";
import { createGridRowProjection } from "../grid-row-projection.ts";

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const placements = [
  { id: "category", x: 0, y: 0, w: 2, h: 1 },
  { id: "following", x: 0, y: 1, w: 1, h: 1 },
];
const fractional = createGridRowProjection(placements, new Map([["category", 1.25]]));
close(fractional.placements[0].h, 1.25);
close(fractional.placements[1].y, 1.25);
close(fractional.getDisplayRow(1), 1.25);
close(fractional.getLogicalRow(1.1), 1);
close(fractional.getLogicalRow(1.75), 1.5);
assert.equal(placements[0].h, 1);
assert.equal(placements[1].y, 1);

for (let columns = 1; columns <= 24; columns++) {
  const innerColumns = Math.max(1, Math.floor(columns / 2));
  const board = {
    layouts: [{ id: "layout", columnCount: columns }],
    sections: [
      { id: "root", kind: "empty", xOffset: 0 },
      ...[
        ["outer", "root", columns],
        ["inner", "outer", innerColumns],
      ].map(([id, parentSectionId, width]) => ({
        id,
        kind: "container",
        options: { collapsible: true, showLabel: true, title: id, scrollable: false },
        layouts: [{ layoutId: "layout", parentSectionId, xOffset: 0, yOffset: 0, width, height: 1 }],
      })),
    ],
    items: [
      {
        id: "tile",
        layouts: [{ layoutId: "layout", sectionId: "inner", xOffset: 0, yOffset: 0, width: 1, height: 1 }],
      },
    ],
  };
  const saved = structuredClone(board);
  for (const canvasScale of [0.25, 0.5, 1, 1.5]) {
    const minimum = getContainerGridMinimumHeights(board, "layout", canvasScale, new Set());
    // The two card widths each lose 10px to side insets. Each header adds
    // 48px plus 10px of vertical insets, independently of column count.
    const innerRowPixels = 212 * canvasScale - 10 / columns - 10 / innerColumns;
    close(minimum.get("outer") * 212 * canvasScale, innerRowPixels + 2 * 58);
    const projection = createGridRowProjection(
      [
        { id: "outer", x: 0, y: 0, w: columns, h: 1 },
        { id: "following", x: 0, y: 1, w: 1, h: 1 },
      ],
      minimum,
    );
    close(projection.placements[1].y * 212 * canvasScale, innerRowPixels + 2 * 58);
    for (const row of [0, 0.25, 0.75, 1, 1.5, 2, 6]) {
      close(projection.getLogicalRow(projection.getDisplayRow(row)), row);
    }
    assert.deepEqual(board, saved);
  }
}
console.log("PASS: exact fractional spacing, both row mappings, and 96 nested sizing combinations");
