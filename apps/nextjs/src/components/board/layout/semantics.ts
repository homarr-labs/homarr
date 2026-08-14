import type { GridPlacement } from "./types";

interface ReadonlyCanvasAttributesInput {
  label: string;
}

interface EditableCanvasAttributesInput extends ReadonlyCanvasAttributesInput {
  columnCount: number;
  rowCount: number;
}

interface EditableGridCellAttributesInput {
  label: string;
  placement: GridPlacement;
}

/**
 * View mode is a labelled region, not an ARIA grid. It keeps the native
 * semantics and focus behavior of links, buttons and widget controls inside.
 */
export const getReadonlyCanvasAttributes = ({ label }: ReadonlyCanvasAttributesInput) =>
  ({
    role: "region",
    "aria-label": label,
    "data-grid-readonly": "true",
  }) as const;

export const getReadonlyGridItemAttributes = (placement: GridPlacement) =>
  ({
    "data-grid-id": placement.id,
    "data-grid-x": placement.x,
    "data-grid-y": placement.y,
    "data-grid-w": placement.w,
    "data-grid-h": placement.h,
  }) as const;

/**
 * Edit mode remains a labelled region. Dashboard placement is not an ARIA
 * data grid: arrow keys edit geometry rather than navigate rows and columns.
 * Each tile is one focusable direct-manipulation surface, while controls inside
 * it keep their native semantics and tab order.
 */
export const getEditableCanvasAttributes = ({ label }: EditableCanvasAttributesInput) =>
  ({
    role: "region",
    "aria-label": label,
    "data-grid-editable": "true",
  }) as const;

export const getEditableGridCellAttributes = ({ label, placement }: EditableGridCellAttributesInput) =>
  ({
    role: "group",
    "aria-label": label,
    tabIndex: 0,
    ...getReadonlyGridItemAttributes(placement),
  }) as const;
