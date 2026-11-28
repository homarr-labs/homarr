import { calculateBoardUiScale } from "@homarr/boards/scale";
import type { SmartContainerOptions } from "@homarr/validation/smart-container";
import { CONTAINER_HEADER_HEIGHT, getLogicalGridSize, LOGICAL_GRID_PITCH } from "~/components/board/layout";

export const getSmartContainerChromeHeight = (showPeeks: boolean) => {
  if (showPeeks) return 140;
  return 44;
};

export const getSmartContainerStateLabel = (title: string | undefined, label: string, index: number) =>
  title?.trim() || `${label} ${Math.max(0, index) + 1}`;

export const canShowSmartContainerPeeks = (
  options: SmartContainerOptions,
  savedRows: number,
  hasHeader: boolean,
  canvasScale: number,
) =>
  options.appearance === "reel" &&
  options.states.length > 2 &&
  savedRows >= 3 &&
  getLogicalGridSize(savedRows - 1) >
    (getSmartContainerChromeHeight(true) + (hasHeader ? CONTAINER_HEADER_HEIGHT : 0) + 24) *
      calculateBoardUiScale(canvasScale);

export const getSmartContainerDisplayRows = (
  savedRows: number,
  contentHeight: number,
  overhead: number,
  parentRowScale = 1,
) => Math.min(savedRows, Math.max(3, (contentHeight + overhead) / (LOGICAL_GRID_PITCH * parentRowScale)));
