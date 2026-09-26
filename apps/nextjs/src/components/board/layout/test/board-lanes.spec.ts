import { describe, expect, test } from "vitest";

import type { Board } from "~/app/[locale]/boards/_types";
import { BoardMockBuilder } from "~/components/board/items/actions/test/mocks/board-mock";

import { EmptySectionMockBuilder } from "~/components/board/items/actions/test/mocks/empty-section-mock";

import { getBoardLaneColumnCount, getRootSectionForLane } from "../index";

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
});
