import { objectEntries } from "@homarr/common";
import type { ValidAnalyseConfig } from "../analyse/types";
import type { BoardSelectionMap } from "../components/initial/board-selection-card";

export const prepareBoards = (analyseConfigs: ValidAnalyseConfig[], selections: BoardSelectionMap) => {
    return analyseConfigs.flatMap(({ name, config }) => {
      const selectedSizes = selections.get(name);
      if (!selectedSizes) return [];
  
      return objectEntries(selectedSizes)
        .map(([size, selected]) => {
          if (!selected) return null;
  
          return {
            name,
            size,
            config,
          };
        })
        .filter((board) => board !== null);
    });
  };