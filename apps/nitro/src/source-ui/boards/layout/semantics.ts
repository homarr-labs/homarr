import type { GridPlacement } from "./types";

export const getReadonlyCanvasAttributes = ({ label }: { label: string }) =>
  ({ role: "region", "aria-label": label, "data-grid-readonly": "true" }) as const;
export const getReadonlyGridItemAttributes = (placement: GridPlacement) =>
  ({
    "data-grid-id": placement.id,
    "data-grid-x": placement.x,
    "data-grid-y": placement.y,
    "data-grid-w": placement.w,
    "data-grid-h": placement.h,
  }) as const;
export const getEditableCanvasAttributes = ({ label }: { label: string; columnCount: number; rowCount: number }) =>
  ({ role: "region", "aria-label": label, "data-grid-editable": "true" }) as const;
export const getEditableGridCellAttributes = ({ label, placement }: { label: string; placement: GridPlacement }) =>
  ({ role: "group", "aria-label": label, tabIndex: 0, ...getReadonlyGridItemAttributes(placement) }) as const;
