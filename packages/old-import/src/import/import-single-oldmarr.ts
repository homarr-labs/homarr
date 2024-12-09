import type { Database } from "@homarr/db";
import type { OldmarrConfig } from "@homarr/old-schema";

import { prepareSingleImport } from "../prepare/prepare-single";
import type { OldmarrImportConfiguration } from "../settings";
import { createBoardInsertCollection } from "./collections/board-collection";

export const importSingleOldmarrConfigAsync = async (
  db: Database,
  config: OldmarrConfig,
  settings: OldmarrImportConfiguration,
) => {
  const { preparedApps, preparedBoards } = prepareSingleImport(config, settings);
  // TODO: We should only insert apps that are not already in the database, so we need to check for that

  const boardInsertCollection = createBoardInsertCollection({ preparedApps, preparedBoards }, settings);

  // Due to a limitation with better-sqlite it's only possible to use it synchronously
  boardInsertCollection.insertAll(db);
};
