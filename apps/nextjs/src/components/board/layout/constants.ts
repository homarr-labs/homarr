/**
 * A grid unit is a fixed logical size. The canvas is scaled as one surface;
 * individual cards never change their internal layout at different viewports.
 */
export const LOGICAL_GRID_CELL_SIZE = 200;
export const LOGICAL_GRID_GAP = 12;
export const LOGICAL_GRID_PITCH = LOGICAL_GRID_CELL_SIZE + LOGICAL_GRID_GAP;

export const COLLAPSED_SECTION_ROW_COUNT = 0.5;
