import { handleTransactionsAsync } from "@homarr/db";
import type { Database } from "@homarr/db";
import { createDbInsertCollectionForTransaction } from "@homarr/db/collection";

import type { HomarrBundle } from "../schema";
import type { PreparedBundleImport } from "./prepare-board";
import { prepareBoardImport } from "./prepare-board";

export type BundleImportReport = {
  created: {
    apps: number;
    items: number;
  };
  warnings: string[];
  boardId: string;
};

export const importBoardBundleAsync = async (
  db: Database,
  bundle: HomarrBundle,
  boardName: string,
  creatorId: string,
  existingApps: Awaited<ReturnType<typeof db.query.apps.findMany>>,
  existingIntegrations: Awaited<ReturnType<typeof db.query.integrations.findMany>>,
  integrationIdsWithAccess: string[],
  hasAccessForAll: boolean,
): Promise<BundleImportReport> => {
  const prepared = prepareBoardImport(
    bundle,
    boardName,
    creatorId,
    existingApps,
    existingIntegrations,
    integrationIdsWithAccess,
    hasAccessForAll,
  );

  await insertPreparedBundleAsync(db, prepared);

  return {
    created: {
      apps: prepared.createdAppsCount,
      items: prepared.createdItemsCount,
    },
    warnings: prepared.warnings,
    boardId: prepared.board.id,
  };
};

const insertPreparedBundleAsync = async (db: Database, prepared: PreparedBundleImport) => {
  const insertCollection = createDbInsertCollectionForTransaction([
    "apps",
    "boards",
    "layouts",
    "sections",
    "sectionLayouts",
    "items",
    "itemLayouts",
    "integrationItems",
  ]);

  insertCollection.apps.push(...prepared.apps);
  insertCollection.boards.push(prepared.board);
  insertCollection.layouts.push(...prepared.layouts);
  insertCollection.sections.push(...prepared.sections);
  insertCollection.sectionLayouts.push(...prepared.sectionLayouts);
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
};
