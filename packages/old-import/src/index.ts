import type { Database } from "@homarr/db";
import type { OldmarrConfig } from "@homarr/old-schema";
import type { OldmarrImportConfiguration } from "@homarr/validation";

import { fixSectionIssues } from "./fix-section-issues";
import { insertAppsAsync } from "./import-apps";
import { insertBoardAsync } from "./import-board";
import { OldHomarrImportError } from "./import-error";
import { insertItemsAsync } from "./import-items";
import { insertSectionsAsync } from "./import-sections";
import { moveWidgetsAndAppsIfMerge } from "./move-widgets-and-apps-merge";

export const importAsync = async (db: Database, old: OldmarrConfig, configuration: OldmarrImportConfiguration) => {
  if (configuration.onlyImportApps) {
    await db
      .transaction(async (trasaction) => {
        await insertAppsAsync(trasaction, old.apps, configuration.distinctAppsByHref, old.configProperties.name);
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

      const boardId = await insertBoardAsync(trasaction, old, configuration.name);
      const sectionIdMaps = await insertSectionsAsync(trasaction, categories, wrappers, boardId);
      const mappedApps = await insertAppsAsync(
        trasaction,
        apps,
        configuration.distinctAppsByHref,
        old.configProperties.name,
      );
      await insertItemsAsync(trasaction, widgets, mappedApps, sectionIdMaps, configuration);
    })
    .catch((error) => {
      throw new OldHomarrImportError(old, error);
    });
};
