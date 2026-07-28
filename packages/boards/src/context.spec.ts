import { describe, expect, test } from "vitest";

import type { RouterOutputs } from "@homarr/api";

import { getBoardLayouts, getCurrentLayout, getDesktopLayout } from "./context";

const createBoard = () =>
  ({
    layouts: [
      { id: "small", name: "Small", columnCount: 4, breakpoint: 0 },
      { id: "medium", name: "Medium", columnCount: 8, breakpoint: 768 },
      { id: "large", name: "Large", columnCount: 12, breakpoint: 1200 },
    ],
  }) as RouterOutputs["board"]["getBoardByName"];

describe("board layout selection", () => {
  test("automatic mode always uses the desktop layout", () => {
    const board = createBoard();

    expect(getDesktopLayout(board).id).toBe("large");
    expect(getCurrentLayout(board, true, 390)).toBe("large");
  });

  test.each([
    [390, "small"],
    [768, "medium"],
    [1024, "medium"],
    [1440, "large"],
  ])("legacy mode selects the matching responsive layout at %spx", (viewportWidth, expectedLayoutId) => {
    expect(getCurrentLayout(createBoard(), false, viewportWidth)).toBe(expectedLayoutId);
  });

  test("keeps every saved layout available for reversible mutations", () => {
    expect(getBoardLayouts(createBoard())).toEqual(["small", "medium", "large"]);
  });
});
