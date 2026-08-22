import { afterEach, describe, expect, test, vi } from "vitest";

import { getLogicalGridSize } from "~/components/board/layout";

import { createGridResizeOutlineController } from "../grid-resize-outline";

describe("grid resize outline", () => {
  afterEach(() => vi.restoreAllMocks());

  test("coalesces pointer updates and removes the outline synchronously", () => {
    const frame = { callback: undefined as FrameRequestCallback | undefined };
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frame.callback = callback;
      return 7;
    });
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    const shell = document.createElement("div");
    const controlled = placement(1, 2, 2, 2);
    const controller = createGridResizeOutlineController(
      () => shell,
      () => controlled,
    );

    controller.schedule({ placement: placement(1, 2, 2, 2), valid: true });
    controller.schedule({ placement: placement(1, 2, 1, 2), valid: false });
    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(shell.querySelector("[data-grid-resize-outline]")).toBeNull();

    frame.callback?.(0);
    const outline = shell.querySelector<HTMLElement>("[data-grid-resize-outline]");
    expect(outline?.style.left).toBe("0px");
    expect(outline?.style.top).toBe("0px");
    expect(outline?.style.width).toBe(`${getLogicalGridSize(1)}px`);
    expect(outline?.style.height).toBe(`${getLogicalGridSize(2)}px`);
    expect(outline?.dataset.gridResizeValid).toBe("false");

    controller.schedule(null);
    expect(cancelFrame).toHaveBeenCalledWith(0);
    expect(shell.querySelector("[data-grid-resize-outline]")).toBeNull();
    controller.destroy();
  });
});

const placement = (x: number, y: number, w: number, h: number) => ({
  id: "item",
  type: "item" as const,
  x,
  y,
  w,
  h,
});
