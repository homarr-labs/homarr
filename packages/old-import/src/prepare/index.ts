import type { InferInsertModel } from "@homarr/db";
import type { apps, boards, integrations, integrationSecrets, sections } from "@homarr/db/schema/sqlite";
import type { OldmarrConfig } from "@homarr/old-schema";
import type { OldmarrImportConfiguration } from "@homarr/validation";

import type { BookmarkApp } from "../widgets/definitions/bookmark";
import { fixSectionIssues } from "./fix-section-issues";
import { moveWidgetsAndAppsIfMerge } from "./move-widgets-and-apps-merge";
import { prepareApps } from "./prepare-apps";
import { prepareBoard } from "./prepare-board";
import { prepareItems } from "./prepare-items";
import { prepareSections } from "./prepare-sections";

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
