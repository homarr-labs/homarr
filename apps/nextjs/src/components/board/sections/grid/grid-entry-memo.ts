import type { SectionGridPlacement } from "./use-grid-layout-actions";

export interface DndGridEntryProps {
  sectionId: string;
  placement: SectionGridPlacement;
  label: string;
  columnCount: number;
  maxRowCount: number | null;
  element: HTMLElement | null;
}

export const areDndGridEntryPropsEqual = (previous: DndGridEntryProps, next: DndGridEntryProps) =>
  previous.sectionId === next.sectionId &&
  previous.label === next.label &&
  previous.columnCount === next.columnCount &&
  previous.maxRowCount === next.maxRowCount &&
  previous.element === next.element &&
  previous.placement.id === next.placement.id &&
  previous.placement.type === next.placement.type &&
  previous.placement.x === next.placement.x &&
  previous.placement.y === next.placement.y &&
  previous.placement.w === next.placement.w &&
  previous.placement.h === next.placement.h &&
  previous.placement.minW === next.placement.minW &&
  previous.placement.minH === next.placement.minH;
