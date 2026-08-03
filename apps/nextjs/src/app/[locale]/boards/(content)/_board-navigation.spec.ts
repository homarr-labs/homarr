import { describe, expect, test } from "vitest";

import { getNextBoardIndex } from "./_board-navigation";

describe("get next board index", () => {
  test.each([
    [3, 0, 1, 1],
    [3, 2, 1, 0],
    [3, 2, -1, 1],
    [3, 0, -1, 2],
  ] as const)("moves through boards with wraparound", (boardCount, currentIndex, direction, expected) => {
    expect(getNextBoardIndex(boardCount, currentIndex, direction)).toBe(expected);
  });

  test.each([
    [0, 0],
    [1, 0],
    [3, -1],
    [3, 3],
  ])("does not navigate with an invalid current board", (boardCount, currentIndex) => {
    expect(getNextBoardIndex(boardCount, currentIndex, 1)).toBeNull();
  });
});
