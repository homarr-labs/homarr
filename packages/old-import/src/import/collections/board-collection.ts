import { createId } from "@homarr/db";
import { logger } from "@homarr/log";

import { fixSectionIssues } from "../../fix-section-issues";
import { mapBoard } from "../../mappers/map-board";
import { moveWidgetsAndAppsIfMerge } from "../../move-widgets-and-apps-merge";
import { prepareItems } from "../../prepare/prepare-items";
import type { prepareMultipleImports } from "../../prepare/prepare-multiple";
import { prepareSections } from "../../prepare/prepare-sections";
import type { InitialOldmarrImportSettings } from "../../settings";
import { createDbInsertCollection } from "./common";

export const createBoardInsertCollection = (
  { preparedApps, preparedBoards }: Omit<ReturnType<typeof prepareMultipleImports>, "preparedIntegrations">,
  settings: InitialOldmarrImportSettings,
) => {
  const insertCollection = createDbInsertCollection(["apps", "boards", "sections", "items"]);
  logger.info("Preparing boards for insert collection");

  const appsMap = new Map(
    preparedApps.flatMap(({ ids, ...app }) => {
      const id = app.existingId ?? createId();
      return ids.map((oldId) => [oldId, { id, ...app }] as const);
    }),
  );

  for (const app of appsMap.values()) {
    // Skip duplicate apps
    if (insertCollection.apps.some((appEntry) => appEntry.id === app.id)) {
      continue;
    }
    // Skip apps that already exist in the database
    if (app.existingId) {
      continue;
    }

    insertCollection.apps.push(app);
  }

  if (settings.onlyImportApps) {
    logger.info(
      `Skipping boards and sections import due to onlyImportApps setting appCount=${insertCollection.apps.length}`,
    );
    return insertCollection;
  }
  logger.debug(`Added apps to board insert collection count=${insertCollection.apps.length}`);

  preparedBoards.forEach((board) => {
    const { wrappers, categories, wrapperIdsToMerge } = fixSectionIssues(board.config);
    const { apps, widgets } = moveWidgetsAndAppsIfMerge(board.config, wrapperIdsToMerge, {
      ...settings,
      screenSize: board.size,
      name: board.name,
    });

    logger.debug(`Fixed issues with sections and item positions fileName=${board.name}`);

    const mappedBoard = mapBoard(board);
    logger.debug(`Mapped board fileName=${board.name} boardId=${mappedBoard.id}`);
    insertCollection.boards.push(mappedBoard);
    const preparedSections = prepareSections(mappedBoard.id, { wrappers, categories });

    for (const section of preparedSections.values()) {
      insertCollection.sections.push(section);
    }
    logger.debug(`Added sections to board insert collection count=${insertCollection.sections.length}`);

    const preparedItems = prepareItems({ apps, widgets }, board.size, appsMap, preparedSections);
    preparedItems.forEach((item) => insertCollection.items.push(item));
    logger.debug(`Added items to board insert collection count=${insertCollection.items.length}`);
  });

  logger.info(
    `Board collection prepared boardCount=${insertCollection.boards.length} sectionCount=${insertCollection.sections.length} itemCount=${insertCollection.items.length} appCount=${insertCollection.apps.length}`,
  );

  return insertCollection;
};
