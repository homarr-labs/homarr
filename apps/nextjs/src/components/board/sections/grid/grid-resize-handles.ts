import { LOGICAL_GRID_PITCH } from "~/components/board/layout";

interface GridResizeMinimum {
  minW?: number;
  minH?: number;
}

export const decorateGridResizeHandles = (element: HTMLElement, minimum: GridResizeMinimum = {}) => {
  element.style.minWidth = `${(minimum.minW ?? 1) * LOGICAL_GRID_PITCH}px`;
  element.style.minHeight = `${(minimum.minH ?? 1) * LOGICAL_GRID_PITCH}px`;

  for (const handle of element.querySelectorAll<HTMLElement>(".ui-resizable-handle")) {
    const direction = Array.from(handle.classList).find((className) =>
      /^ui-resizable-(?:n|ne|e|se|s|sw|w|nw)$/.test(className),
    );
    if (!direction) continue;
    const directionName = direction.replace("ui-resizable-", "");

    handle.setAttribute(
      "data-testid",
      directionName === "se" ? "board-grid-resize-handle" : `board-grid-resize-handle-${directionName}`,
    );
    handle.setAttribute("data-grid-resize-direction", directionName);
    handle.setAttribute("aria-hidden", "true");
  }
};
