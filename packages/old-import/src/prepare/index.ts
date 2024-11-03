import type { InferInsertModel, InferSelectModel } from "@homarr/db";
import { apps, boards, integrations, integrationSecrets, sections } from "@homarr/db/schema/sqlite";
import type { OldmarrConfig } from "@homarr/old-schema";
import type { OldmarrImportConfiguration } from "@homarr/validation";

import { fixSectionIssues } from "./fix-section-issues";
import { moveWidgetsAndAppsIfMerge } from "./move-widgets-and-apps-merge";
import { prepareApps } from "./prepare-apps";
import { prepareBoard } from "./prepare-board";
import { prepareIntegrations } from "./prepare-integrations";
import { prepareItems } from "./prepare-items";
import { prepareSections } from "./prepare-sections";

export interface ImportThingsToCreate {
  apps: InferInsertModel<typeof apps>[];
  boards: InferInsertModel<typeof boards>[];
  sections: InferInsertModel<typeof sections>[];
  integrations: InferInsertModel<typeof integrations>[];
  integrationSecrets: InferInsertModel<typeof integrationSecrets>[];
}

export const prepareImport = (
  old: OldmarrConfig,
  configuration: OldmarrImportConfiguration,
  existingApps: InferSelectModel<typeof apps>[] = [],
) => {
  const { map: appsMap, appsToCreate } = prepareApps(old, configuration.distinctAppsByHref ? existingApps : []);

  if (configuration.onlyImportApps) {
    return {
      apps: appsToCreate,
      boards: [],
      items: [],
      sections: [],
      integrations: [],
    };
  }

  const { wrappers, categories, wrapperIdsToMerge } = fixSectionIssues(old);
  const { apps, widgets } = moveWidgetsAndAppsIfMerge(old, wrapperIdsToMerge, configuration);

  const board = prepareBoard(old, configuration);

  const { map: sectionIdMap, sectionsToCreate } = prepareSections(categories, wrappers, board.id);

  const integrationsToCreate = prepareIntegrations(old);

  const itemsToCreate = prepareItems(widgets, apps, appsMap, sectionIdMap, configuration);

  return {
    apps: appsToCreate,
    boards: [board],
    items: itemsToCreate,
    sections: sectionsToCreate,
    integrations: integrationsToCreate,
  };
};
