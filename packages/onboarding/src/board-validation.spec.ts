import { describe, expect, it } from "vitest";

import { getBoardValidationErrors } from "./board-validation";

describe("getBoardValidationErrors", () => {
  it("keeps attempted board errors visible until each value is corrected", () => {
    expect(
      getBoardValidationErrors({
        attempted: true,
        hasExistingBoards: true,
        selectedBoardId: null,
        boardName: "",
      }),
    ).toEqual({ target: true, name: true });

    expect(
      getBoardValidationErrors({
        attempted: true,
        hasExistingBoards: true,
        selectedBoardId: "board-id",
        boardName: "dashboard",
      }),
    ).toEqual({ target: false, name: false });
  });

  it("does not require a target when setup has no existing board", () => {
    expect(
      getBoardValidationErrors({
        attempted: true,
        hasExistingBoards: false,
        selectedBoardId: null,
        boardName: "dashboard",
      }).target,
    ).toBe(false);
  });
});
