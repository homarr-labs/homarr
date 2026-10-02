import { beforeEach, describe, expect, test } from "vitest";

import { getLogicalGridSize, LOGICAL_GRID_PITCH } from "~/components/board/layout";

import { createGridPreviewDomState, syncGridPreviewGeometry } from "../grid-preview-geometry";

describe("grid preview geometry", () => {
  let elements: Map<string, HTMLElement>;

  beforeEach(() => {
    elements = new Map([
      ["active", createEntry("active", 0, 0, 2, 2)],
      ["displaced", createEntry("displaced", 2, 0, 1, 1)],
    ]);
  });

  test("moves displaced entries without moving the active drag source", () => {
    const placements = [placement("active", 0, 0, 2, 2), placement("displaced", 2, 0, 1, 1)];
    const state = syncGridPreviewGeometry({
      elements,
      placements,
      previewPlacements: [placement("active", 2, 0, 2, 2), placement("displaced", 0, 2, 1, 1)],
      activeId: "active",
      mode: "drag",
      previous: createGridPreviewDomState(),
    });

    expect(elements.get("active")?.hasAttribute("data-grid-preview")).toBe(false);
    expect(elements.get("active")?.getAttribute("data-dnd-active")).toBe("true");
    expect(elements.get("displaced")?.style.getPropertyValue("--board-grid-preview-x")).toBe(
      `${-2 * LOGICAL_GRID_PITCH}px`,
    );
    expect(elements.get("displaced")?.style.getPropertyValue("--board-grid-preview-y")).toBe(
      `${2 * LOGICAL_GRID_PITCH}px`,
    );
    expect(elements.get("displaced")?.dataset.gridX).toBe("0");
    expect(elements.get("displaced")?.dataset.gridY).toBe("2");

    syncGridPreviewGeometry({
      elements,
      placements,
      previewPlacements: null,
      activeId: null,
      mode: null,
      previous: state,
    });

    expect(elements.get("active")?.hasAttribute("data-dnd-active")).toBe(false);
    expect(elements.get("displaced")?.hasAttribute("data-grid-preview")).toBe(false);
    expect(elements.get("displaced")?.dataset.gridX).toBe("2");
    expect(elements.get("displaced")?.dataset.gridY).toBe("0");
  });

  test("applies snapped size and position to the active resize shell", () => {
    syncGridPreviewGeometry({
      elements,
      placements: [placement("active", 0, 0, 2, 2)],
      previewPlacements: [placement("active", 1, 1, 3, 4)],
      activeId: "active",
      mode: "resize",
      previous: createGridPreviewDomState(),
    });

    const active = elements.get("active");
    expect(active?.getAttribute("data-grid-preview")).toBe("true");
    expect(active?.style.getPropertyValue("--board-grid-preview-x")).toBe(`${LOGICAL_GRID_PITCH}px`);
    expect(active?.style.getPropertyValue("--board-grid-preview-y")).toBe(`${LOGICAL_GRID_PITCH}px`);
    expect(active?.style.getPropertyValue("--board-grid-preview-width")).toBe(`${getLogicalGridSize(3)}px`);
    expect(active?.style.getPropertyValue("--board-grid-preview-height")).toBe(`${getLogicalGridSize(4)}px`);
    expect(active?.dataset.gridW).toBe("3");
    expect(active?.dataset.gridH).toBe("4");
  });
});

const placement = (id: string, x: number, y: number, w: number, h: number) => ({
  id,
  type: "item" as const,
  x,
  y,
  w,
  h,
});

const createEntry = (id: string, x: number, y: number, w: number, h: number) => {
  const element = document.createElement("div");
  element.dataset.gridItemId = id;
  element.dataset.gridX = String(x);
  element.dataset.gridY = String(y);
  element.dataset.gridW = String(w);
  element.dataset.gridH = String(h);
  return element;
};
