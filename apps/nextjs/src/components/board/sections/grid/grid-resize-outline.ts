import { getLogicalGridSize, LOGICAL_GRID_PITCH } from "~/components/board/layout";
import type { GridPlacement } from "~/components/board/layout";

interface ResizeOutlinePreview {
  placement: GridPlacement;
  valid: boolean;
}

export const createGridResizeOutlineController = (
  getShell: () => HTMLElement | null,
  getControlledPlacement: () => GridPlacement,
  getDisplayedPlacement: (placement: GridPlacement) => GridPlacement = (placement) => placement,
) => {
  let frame = 0;
  let pending: ResizeOutlinePreview | null = null;

  const remove = () => {
    getShell()?.querySelector(":scope > [data-grid-resize-outline]")?.remove();
  };

  const flush = () => {
    frame = 0;
    const shell = getShell();
    const preview = pending;
    if (!shell || !preview) return;

    const controlled = getControlledPlacement();
    const visualX = toFiniteNumber(shell.dataset.gridX, controlled.x);
    const visualY = toFiniteNumber(shell.dataset.gridY, controlled.y);
    const displayedControlled = getDisplayedPlacement({ ...controlled, x: visualX, y: visualY });
    const displayedPreview = getDisplayedPlacement(preview.placement);
    const outline =
      shell.querySelector<HTMLElement>(":scope > [data-grid-resize-outline]") ?? createResizeOutline(shell);
    outline.style.position = "absolute";
    outline.style.left = `${(displayedPreview.x - displayedControlled.x) * LOGICAL_GRID_PITCH}px`;
    outline.style.top = `calc(${(displayedPreview.y - displayedControlled.y) * LOGICAL_GRID_PITCH}px * var(--board-grid-row-scale, 1))`;
    outline.style.width = `${getLogicalGridSize(displayedPreview.w)}px`;
    outline.style.height = `calc(${getLogicalGridSize(displayedPreview.h)}px * var(--board-grid-row-scale, 1))`;
    outline.dataset.gridResizeValid = String(preview.valid);
  };

  return {
    schedule(preview: ResizeOutlinePreview | null) {
      pending = preview;
      if (!preview) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        remove();
        return;
      }
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(flush);
    },
    destroy() {
      pending = null;
      window.cancelAnimationFrame(frame);
      frame = 0;
      remove();
    },
  };
};

const toFiniteNumber = (value: string | undefined, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const createResizeOutline = (shell: HTMLElement) => {
  const outline = document.createElement("div");
  outline.className = "board-grid-resize-outline";
  outline.dataset.gridResizeOutline = "";
  outline.setAttribute("aria-hidden", "true");
  shell.append(outline);
  return outline;
};
