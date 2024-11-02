import type { InferInsertModel } from "@homarr/db";
import type { apps, boards, integrations, integrationSecrets, sections } from "@homarr/db/schema/sqlite";
import type { OldmarrConfig } from "@homarr/old-schema";
import type { OldmarrImportConfiguration } from "@homarr/validation";

import { fixSectionIssues } from "./fix-section-issues";
import { prepareApps } from "./import-apps";
import { prepareBoard } from "./import-board";
import { prepareItems } from "./import-items";
import { prepareSections } from "./import-sections";
import { moveWidgetsAndAppsIfMerge } from "./move-widgets-and-apps-merge";
import type { BookmarkApp } from "./widgets/definitions/bookmark";

export interface ImportThingsToCreate {
  apps: InferInsertModel<typeof apps>[];
  boards: InferInsertModel<typeof boards>[];
  sections: InferInsertModel<typeof sections>[];
  integrations: InferInsertModel<typeof integrations>[];
  integrationSecrets: InferInsertModel<typeof integrationSecrets>[];
}

export const prepareImport = (old: OldmarrConfig, configuration: OldmarrImportConfiguration) => {
  const bookmarkApps = old.widgets
    .filter((widget) => widget.type === "bookmark")
    .map((widget) => widget.properties.items)
    .flat() as BookmarkApp[];

  const { map: appsMap, appsToCreate } = prepareApps(old.apps, bookmarkApps);

  if (configuration.onlyImportApps) {
    return {
      apps: appsToCreate,
      boards: [],
      items: [],
      sections: [],
    };
  }

  const { wrappers, categories, wrapperIdsToMerge } = fixSectionIssues(old);
  const { apps, widgets } = moveWidgetsAndAppsIfMerge(old, wrapperIdsToMerge, configuration);

  const board = prepareBoard(old, configuration);

  const { map: sectionIdMap, sectionsToCreate } = prepareSections(categories, wrappers, board.id);

  const itemsToCreate = prepareItems(widgets, apps, appsMap, sectionIdMap, configuration);

  return {
    apps: appsToCreate,
    boards: [board],
    items: itemsToCreate,
    sections: sectionsToCreate,
  };
};
/*
export const importAsync = async (db: Database, old: OldmarrConfig, configuration: OldmarrImportConfiguration) => {
  if (configuration.onlyImportApps) {
    await db
      .transaction(async (trasaction) => {
        await prepareAppsAsync(
          trasaction,

          old.apps,
          bookmarkApps,
          configuration.distinctAppsByHref,
          old.configProperties.name,
        );
      })
      .catch((error) => {
        throw new OldHomarrImportError(old, error);
      });
    return;
  }

  await db
    .transaction(async (trasaction) => {
      const { wrappers, categories, wrapperIdsToMerge } = fixSectionIssues(old);
      const { apps, widgets } = moveWidgetsAndAppsIfMerge(old, wrapperIdsToMerge, configuration);

      const boardId = await insertBoardAsync(trasaction, old, configuration);
      const sectionIdMaps = await prepareSectionsAsync(trasaction, categories, wrappers, boardId);
      const appsMap = await prepareAppsAsync(
        trasaction,
        apps,
        bookmarkApps,
        configuration.distinctAppsByHref,
        old.configProperties.name,
      );
      await prepareItemsAsync(trasaction, widgets, apps, appsMap, sectionIdMaps, configuration);
    })
    .catch((error) => {
      if (error instanceof OldHomarrScreenSizeError) {
        throw error;
      }

      throw new OldHomarrImportError(old, error);
    });
};
*/
