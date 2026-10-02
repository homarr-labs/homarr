import { describe, expect, test } from "vitest";

import type { Board } from "~/app/[locale]/boards/_types";
import { BoardMockBuilder } from "~/components/board/items/actions/test/mocks/board-mock";
import { ContainerSectionMockBuilder } from "~/components/board/items/actions/test/mocks/container-section-mock";
import { EmptySectionMockBuilder } from "~/components/board/items/actions/test/mocks/empty-section-mock";
import { ItemMockBuilder } from "~/components/board/items/actions/test/mocks/item-mock";
import {
  getBoardLaneColumnCount,
  getInitialBoardLogicalHeight,
  getLogicalGridSize,
  getRootSectionForLane,
} from "../index";

describe("board lanes", () => {
  test("gutters consume columns from the main canvas", () => {
    const layout = {
      id: "layout",
      name: "Base",
      columnCount: 12,
      leftGutterColumnCount: 2,
      rightGutterColumnCount: 3,
      breakpoint: 0,
      role: "base",
    } satisfies Board["layouts"][number];

    expect(getBoardLaneColumnCount(layout, "left")).toBe(2);
    expect(getBoardLaneColumnCount(layout, "main")).toBe(7);
    expect(getBoardLaneColumnCount(layout, "right")).toBe(3);
  });

  test("clamps invalid gutters while preserving one main column", () => {
    const layout = {
      id: "layout",
      name: "Base",
      columnCount: 4,
      leftGutterColumnCount: 3,
      rightGutterColumnCount: 3,
      breakpoint: 0,
      role: "base",
    } satisfies Board["layouts"][number];

    expect(getBoardLaneColumnCount(layout, "left")).toBe(3);
    expect(getBoardLaneColumnCount(layout, "main")).toBe(1);
    expect(getBoardLaneColumnCount(layout, "right")).toBe(0);
  });

  test("disables gutters for mobile layouts", () => {
    const layout = {
      id: "mobile",
      name: "Mobile",
      columnCount: 12,
      leftGutterColumnCount: 2,
      rightGutterColumnCount: 3,
      breakpoint: 0,
      role: "mobile",
    } satisfies Board["layouts"][number];

    expect(getBoardLaneColumnCount(layout, "left")).toBe(0);
    expect(getBoardLaneColumnCount(layout, "main")).toBe(12);
    expect(getBoardLaneColumnCount(layout, "right")).toBe(0);
  });

  test("rejects ambiguous duplicate roots", () => {
    const board = new BoardMockBuilder()
      .addSection(new EmptySectionMockBuilder({ id: "main-a" }).build())
      .addSection(new EmptySectionMockBuilder({ id: "main-b" }).build())
      .build();

    expect(() => getRootSectionForLane(board, "main")).toThrow("multiple main canvas roots");
  });

  test("calculates a stable server height from the tallest visible lane", () => {
    const layoutId = "layout";
    const mainSectionId = "main";
    const leftSectionId = "left";
    const containerSectionId = "container";
    const board = new BoardMockBuilder()
      .addSection(new EmptySectionMockBuilder({ id: mainSectionId }).build())
      .addSection(new EmptySectionMockBuilder({ id: leftSectionId, xOffset: -1 }).build())
      .addSection(
        new ContainerSectionMockBuilder({
          id: containerSectionId,
          collapsed: true,
          options: { collapsible: true },
        })
          .addLayout({
            layoutId,
            parentSectionId: mainSectionId,
            xOffset: 0,
            yOffset: 0,
            width: 2,
            height: 3,
          })
          .build(),
      )
      .addItem(
        new ItemMockBuilder()
          .addLayout({
            layoutId,
            sectionId: mainSectionId,
            xOffset: 0,
            yOffset: 3,
            width: 1,
            height: 1,
          })
          .build(),
      )
      .addItem(
        new ItemMockBuilder()
          .addLayout({
            layoutId,
            sectionId: leftSectionId,
            xOffset: 0,
            yOffset: 0,
            width: 1,
            height: 4,
          })
          .build(),
      )
      .build();
    board.layouts = [
      {
        id: layoutId,
        name: "Base",
        columnCount: 8,
        leftGutterColumnCount: 1,
        rightGutterColumnCount: 0,
        breakpoint: 0,
        role: "base",
      },
    ];

    expect(getInitialBoardLogicalHeight(board, layoutId)).toBe(getLogicalGridSize(4));
  });
});
