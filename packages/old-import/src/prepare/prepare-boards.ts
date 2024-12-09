import { objectEntries } from "@homarr/common";
import type { BoardSize } from "@homarr/old-schema";

import type { ValidAnalyseConfig } from "../analyse/types";
import type { BoardSelectionMap } from "../components/initial/board-selection-card";

const boardSizeSuffix: Record<BoardSize, string> = {
  lg: "large",
  md: "medium",
  sm: "small",
};

export const createBoardName = (fileName: string, boardSize: BoardSize) => {
  return `${fileName.replace(".json", "")}-${boardSizeSuffix[boardSize]}`;
};

export const prepareBoards = (analyseConfigs: ValidAnalyseConfig[], selections: BoardSelectionMap) => {
  return analyseConfigs.flatMap(({ name, config }) => {
    const selectedSizes = selections.get(name);
    if (!selectedSizes) return [];

    return objectEntries(selectedSizes)
      .map(([size, selected]) => {
        if (!selected) return null;

        return {
          name: createBoardName(name, size),
          size,
          config,
        };
      })
      .filter((board) => board !== null);
  });
};
