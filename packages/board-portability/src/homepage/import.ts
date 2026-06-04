import { handleTransactionsAsync } from "@homarr/db";
import type { Database } from "@homarr/db";
import { createDbInsertCollectionForTransaction } from "@homarr/db/collection";

import { parseServicesYaml } from "./parse-services-yaml";
import { prepareHomepageImport } from "./prepare-homepage-import";

export type HomepageImportReport = {
  boardId: string;
  created: {
    apps: number;
    integrations: number;
    items: number;
    sections: number;
  };
  warnings: string[];
  unmappedWidgetTypes: string[];
};

export const importHomepageServicesAsync = async (
  db: Database,
  content: string,
  boardName: string,
  creatorId: string,
  createIntegrations: boolean,
): Promise<HomepageImportReport> => {
  const parsed = parseServicesYaml(content);
  if (!parsed.success) {
    throw new Error(parsed.error);
  }

  const prepared = prepareHomepageImport(parsed.services, boardName, creatorId, createIntegrations);

  const insertCollection = createDbInsertCollectionForTransaction([
    "apps",
    "integrations",
    "integrationSecrets",
    "boards",
    "layouts",
    "sections",
    "items",
    "itemLayouts",
    "integrationItems",
  ]);

  insertCollection.apps.push(...prepared.apps);
  insertCollection.integrations.push(...prepared.integrations);
  insertCollection.integrationSecrets.push(...prepared.integrationSecrets);
  insertCollection.boards.push(prepared.board);
  insertCollection.layouts.push(...prepared.layouts);
  insertCollection.sections.push(...prepared.sections);
  insertCollection.items.push(...prepared.items);
  insertCollection.itemLayouts.push(...prepared.itemLayouts);
  insertCollection.integrationItems.push(...prepared.integrationItems);

  await handleTransactionsAsync(db, {
    async handleAsync(innerDb) {
      await insertCollection.insertAllAsync(innerDb);
    },
    handleSync(innerDb) {
      insertCollection.insertAll(innerDb);
    },
  });

  return {
    boardId: prepared.board.id,
    created: {
      apps: prepared.apps.length,
      integrations: prepared.integrations.length,
      items: prepared.items.length,
      sections: prepared.sections.length,
    },
    warnings: prepared.warnings,
    unmappedWidgetTypes: prepared.unmappedWidgetTypes,
  };
};
