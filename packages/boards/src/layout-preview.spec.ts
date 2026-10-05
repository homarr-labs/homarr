import { describe, expect, test } from "vitest";

import type { BoardPreviewData, BoardPreviewLayout } from "./layout-preview";
import { getRepresentativeLayoutWidth, projectBoardLayout } from "./layout-preview";

const mobile = {
  id: "mobile",
  columnCount: 3,
  leftGutterColumnCount: 0,
  rightGutterColumnCount: 0,
  breakpoint: 0,
  role: "mobile",
} satisfies BoardPreviewLayout;
const custom = {
  id: "tablet",
  columnCount: 6,
  leftGutterColumnCount: 0,
  rightGutterColumnCount: 0,
  breakpoint: 480,
  role: "custom",
} satisfies BoardPreviewLayout;
const base = {
  id: "base",
  columnCount: 12,
  leftGutterColumnCount: 0,
  rightGutterColumnCount: 0,
  breakpoint: 768,
  role: "base",
} satisfies BoardPreviewLayout;

const root = { id: "root", kind: "empty" as const, xOffset: 0, layouts: [] };

describe("layout representative widths", () => {
  test("uses phone, activation midpoint, and desktop widths", () => {
    const layouts = [mobile, custom, base];
    expect(getRepresentativeLayoutWidth(mobile, layouts)).toBe(390);
    expect(getRepresentativeLayoutWidth(custom, layouts)).toBe(624);
    expect(getRepresentativeLayoutWidth(base, layouts)).toBe(1280);
  });
});

describe("projectBoardLayout", () => {
  test("keeps exact saved positions for the active layout", () => {
    const board = {
      layouts: [mobile],
      sections: [
        root,
        {
          id: "container",
          kind: "container",
          xOffset: null,
          layouts: [
            {
              layoutId: mobile.id,
              parentSectionId: root.id,
              width: 3,
              height: 2,
              xOffset: 0,
              yOffset: 0,
            },
          ],
        },
      ],
      items: [],
    } satisfies BoardPreviewData;

    expect(projectBoardLayout(board, mobile, mobile)).toEqual([
      expect.objectContaining({ id: "container", sectionId: root.id, width: 3, height: 2 }),
    ]);
  });

  test("reflows root items and containers while retaining nested items", () => {
    const board = {
      layouts: [mobile, base],
      sections: [
        root,
        {
          id: "container",
          kind: "container",
          xOffset: null,
          layouts: [
            {
              layoutId: base.id,
              parentSectionId: root.id,
              width: 6,
              height: 3,
              xOffset: 6,
              yOffset: 0,
            },
          ],
        },
      ],
      items: [
        {
          id: "root-item",
          layouts: [
            {
              layoutId: base.id,
              sectionId: root.id,
              width: 5,
              height: 2,
              xOffset: 0,
              yOffset: 0,
            },
          ],
        },
        {
          id: "nested-item",
          layouts: [
            {
              layoutId: base.id,
              sectionId: "container",
              width: 4,
              height: 1,
              xOffset: 0,
              yOffset: 0,
            },
          ],
        },
      ],
    } satisfies BoardPreviewData;

    const projected = projectBoardLayout(board, base, mobile);

    expect(projected.find((element) => element.id === "root-item")).toMatchObject({
      type: "item",
      width: 3,
      height: 2,
      xOffset: 0,
      yOffset: 0,
      sectionId: root.id,
    });
    expect(projected.find((element) => element.id === "container")).toMatchObject({
      type: "section",
      width: 3,
      xOffset: 0,
      yOffset: 2,
      sectionId: root.id,
    });
    expect(projected.find((element) => element.id === "nested-item")).toMatchObject({
      type: "item",
      width: 3,
      sectionId: "container",
    });
  });

  test("ignores missing positions and supports empty boards", () => {
    const board = {
      layouts: [mobile],
      sections: [root],
      items: [{ id: "missing", layouts: [] }],
    } satisfies BoardPreviewData;

    expect(projectBoardLayout(board, base, mobile)).toEqual([]);
  });

  test("moves fixed-rail items into the mobile canvas without overlap", () => {
    const baseWithRails = {
      ...base,
      leftGutterColumnCount: 2,
      rightGutterColumnCount: 2,
    };
    const roots = [
      { id: "left", kind: "empty" as const, xOffset: -1, layouts: [] },
      root,
      { id: "right", kind: "empty" as const, xOffset: 1, layouts: [] },
    ];
    const board = {
      layouts: [mobile, baseWithRails],
      sections: roots,
      items: roots.map((section, index) => ({
        id: `item-${section.id}`,
        layouts: [
          {
            layoutId: base.id,
            sectionId: section.id,
            width: 2,
            height: 1,
            xOffset: 0,
            yOffset: index,
          },
        ],
      })),
    } satisfies BoardPreviewData;

    const projected = projectBoardLayout(board, baseWithRails, mobile);

    expect(projected).toHaveLength(3);
    expect(projected.every((element) => element.sectionId === root.id)).toBe(true);
    expect(projected.every((element) => element.xOffset >= 0 && element.xOffset + element.width <= 3)).toBe(true);
    for (const [index, element] of projected.entries()) {
      expect(
        projected
          .slice(index + 1)
          .some(
            (other) =>
              element.xOffset < other.xOffset + other.width &&
              element.xOffset + element.width > other.xOffset &&
              element.yOffset < other.yOffset + other.height &&
              element.yOffset + element.height > other.yOffset,
          ),
      ).toBe(false);
    }
  });

  test("returns an empty preview when malformed data has no main root", () => {
    const board = {
      layouts: [mobile, base],
      sections: [{ id: "left", kind: "empty", xOffset: -1, layouts: [] }],
      items: [],
    } satisfies BoardPreviewData;

    expect(projectBoardLayout(board, base, mobile)).toEqual([]);
  });
});
