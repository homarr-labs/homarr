import { describe, expect, test } from "vitest";

import { decorateGridResizeHandles } from "../grid-resize-handles";

describe("grid resize handle decoration", () => {
  test("restores accessible hit-target markers after GridStack refreshes its handles", () => {
    const item = document.createElement("div");
    item.innerHTML = `
      <div class="ui-resizable-handle ui-resizable-e"></div>
      <div class="ui-resizable-handle ui-resizable-se"></div>
    `;

    decorateGridResizeHandles(item);

    const east = item.querySelector<HTMLElement>(".ui-resizable-e");
    const southeast = item.querySelector<HTMLElement>(".ui-resizable-se");
    expect(east?.dataset.testid).toBe("board-grid-resize-handle-e");
    expect(east?.dataset.gridResizeDirection).toBe("e");
    expect(east?.getAttribute("aria-hidden")).toBe("true");
    expect(southeast?.dataset.testid).toBe("board-grid-resize-handle");
    expect(southeast?.dataset.gridResizeDirection).toBe("se");
    expect(southeast?.getAttribute("aria-hidden")).toBe("true");
  });
});
