import { boardLanes, getBoardLaneColumnCount } from "@homarr/definitions";

import { getLogicalGridSize } from "./geometry";

export const BOARD_LANE_GAP = 24;

/** Shared horizontal geometry for the live board and its settings playground. */
export const getBoardCanvasGeometry = (layout: Parameters<typeof getBoardLaneColumnCount>[0]) => {
  let width = 0;
  const lanes = boardLanes.flatMap((lane) => {
    const columnCount = getBoardLaneColumnCount(layout, lane);
    if (columnCount === 0) return [];

    if (width > 0) width += BOARD_LANE_GAP;
    const offset = width;
    const laneWidth = getLogicalGridSize(columnCount);
    width += laneWidth;
    return [{ lane, columnCount, width: laneWidth, offset }];
  });

  return { lanes, width, gridTemplateColumns: lanes.map((lane) => `${lane.width}px`).join(" ") };
};
