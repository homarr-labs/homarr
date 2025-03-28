import type { Session } from "@homarr/auth";
import { isWidgetRestricted } from "@homarr/auth/shared";
import { createId } from "@homarr/db";
import { createDbInsertCollectionForTransaction } from "@homarr/db/collection";
import { logger } from "@homarr/log";
import type { BoardSize } from "@homarr/old-schema";
import { boardSizes, getBoardSizeName } from "@homarr/old-schema";

import { widgetImports } from "../../../../widgets/src";
import { fixSectionIssues } from "../../fix-section-issues";
import { mapBoard } from "../../mappers/map-board";
import { mapBreakpoint } from "../../mappers/map-breakpoint";
import { mapColumnCount } from "../../mappers/map-column-count";
import { moveWidgetsAndAppsIfMerge } from "../../move-widgets-and-apps-merge";
import { prepareItems } from "../../prepare/prepare-items";
import type { prepareMultipleImports } from "../../prepare/prepare-multiple";
import { prepareSections } from "../../prepare/prepare-sections";
import type { InitialOldmarrImportSettings } from "../../settings";

export const createBoardInsertCollection = (
  { preparedApps, preparedBoards }: Omit<ReturnType<typeof prepareMultipleImports>, "preparedIntegrations">,
  settings: InitialOldmarrImportSettings,
  session: Session | null,
) => {
  const insertCollection = createDbInsertCollectionForTransaction([
    "apps",
    "boards",
    "layouts",
    "sections",
    "items",
    "itemLayouts",
  ]);
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
      name: board.name,
    });

    logger.debug(`Fixed issues with sections and item positions fileName=${board.name}`);

    const mappedBoard = mapBoard(board);
    logger.debug(`Mapped board fileName=${board.name} boardId=${mappedBoard.id}`);
    insertCollection.boards.push(mappedBoard);

    const layoutMapping = boardSizes.reduce(
      (acc, size) => {
        acc[size] = createId();
        return acc;
      },
      {} as Record<BoardSize, string>,
    );

    insertCollection.layouts.push(
      ...boardSizes.map((size) => ({
        id: layoutMapping[size],
        boardId: mappedBoard.id,
        columnCount: mapColumnCount(board.config.settings.customization.gridstack, size),
        breakpoint: mapBreakpoint(size),
        name: getBoardSizeName(size),
      })),
    );

    const preparedSections = prepareSections(mappedBoard.id, { wrappers, categories });

    for (const section of preparedSections.values()) {
      insertCollection.sections.push(section);
    }
    logger.debug(`Added sections to board insert collection count=${insertCollection.sections.length}`);

    const preparedItems = prepareItems(
      {
        apps,
        widgets,
        settings: board.config.settings,
      },
      appsMap,
      preparedSections,
      layoutMapping,
      mappedBoard.id,
    );
    preparedItems
      .filter((item) => {
        return !isWidgetRestricted({
          definition: widgetImports[item.kind].definition,
          user: session?.user ?? null,
          check: (level) => level !== "none",
        });
      })
      .forEach(({ layouts, ...item }) => {
        insertCollection.items.push(item);
        insertCollection.itemLayouts.push(...layouts);
      });
    logger.debug(`Added items to board insert collection count=${insertCollection.items.length}`);
  });

  logger.info(
    `Board collection prepared boardCount=${insertCollection.boards.length} sectionCount=${insertCollection.sections.length} itemCount=${insertCollection.items.length} appCount=${insertCollection.apps.length}`,
  );

  return insertCollection;
};
