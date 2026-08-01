import { describe, expect, it } from "vitest";

import { getBoardSaveScopeId, shouldRefetchAfterSaveError } from "./updater";

describe("board persistence coordination", () => {
  it("uses one mutation scope for every save of the same board", () => {
    expect(getBoardSaveScopeId("board-1")).toBe(getBoardSaveScopeId("board-1"));
    expect(getBoardSaveScopeId("board-1")).not.toBe(getBoardSaveScopeId("board-2"));
  });

  it("only refetches after a failed save when no newer local board exists", () => {
    const failedBoard = { id: "board-1", items: ["first"] };
    const newerBoard = { id: "board-1", items: ["first", "second"] };

    expect(shouldRefetchAfterSaveError(failedBoard, failedBoard)).toBe(true);
    expect(shouldRefetchAfterSaveError(newerBoard, failedBoard)).toBe(false);
  });
});
