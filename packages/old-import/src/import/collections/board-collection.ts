import { createId } from "@homarr/db";
import { fixSectionIssues } from "../../fix-section-issues";
import { mapBoard } from "../../mappers/map-board";
import { moveWidgetsAndAppsIfMerge } from "../../move-widgets-and-apps-merge";
import { prepareItems } from "../../prepare/prepare-items";
import type { prepareMultipleImports } from "../../prepare/prepare-multiple";
import { prepareSections } from "../../prepare/prepate-sections";
import { createDbInsertCollection } from "./common";
import type { InitialOldmarrImportSettings } from "../../settings";

export const createBoardInsertCollection = (
    { preparedApps, preparedBoards }: Omit<ReturnType<typeof prepareMultipleImports>, "preparedIntegrations">,
    settings: InitialOldmarrImportSettings,
  ) => {
    const insertCollection = createDbInsertCollection();
  
    const appsMap = new Map(
      preparedApps.flatMap(({ ids, ...app }) => {
        const id = createId();
        return ids.map((oldId) => [oldId, { id, ...app }] as const);
      }),
    );
  
    for (const app of appsMap.values()) {
        // Skip duplicate apps
        if (insertCollection.apps.some((appEntry) => appEntry.id === app.id)) {
          continue;
        }

        insertCollection.apps.push(app);
    }

    if (settings.onlyImportApps) return insertCollection;
  
    preparedBoards.forEach((board) => {
      const { wrappers, categories, wrapperIdsToMerge } = fixSectionIssues(board.config);
      const { apps, widgets } = moveWidgetsAndAppsIfMerge(board.config, wrapperIdsToMerge, {
        ...settings,
        screenSize: board.size,
        name: board.name,
      });
  
      const mappedBoard = mapBoard(board);
      insertCollection.boards.push(mappedBoard);
      const preparedSections = prepareSections(mappedBoard.id, { wrappers, categories });
      
      for (const section of preparedSections.values()) {
        insertCollection.sections.push(section);
      }

      const preparedItems = prepareItems({ apps, widgets }, board.size, appsMap, preparedSections);
      preparedItems.forEach((item) => insertCollection.items.push(item));
    });
  
    return insertCollection;
  };