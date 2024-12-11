import type { z } from "zod";

import { Stopwatch } from "@homarr/common";
import type { Database } from "@homarr/db";
import { logger } from "@homarr/log";

import { analyseOldmarrImportAsync } from "../analyse/analyse-oldmarr-import";
import { prepareMultipleImports } from "../prepare/prepare-multiple";
import { createBoardInsertCollection } from "./collections/board-collection";
import { createIntegrationInsertCollection } from "./collections/integration-collection";
import { createUserInsertCollection } from "./collections/user-collection";
import type { importInitialOldmarrInputSchema } from "./input";
import { ensureValidTokenOrThrow } from "./validate-token";

export const importInitialOldmarrAsync = async (
  db: Database,
  input: z.infer<typeof importInitialOldmarrInputSchema>,
) => {
  const stopwatch = new Stopwatch();
  const { checksum, configs, users: importUsers } = await analyseOldmarrImportAsync(input.file);
  ensureValidTokenOrThrow(checksum, input.token);

  const { preparedApps, preparedBoards, preparedIntegrations } = prepareMultipleImports(
    configs,
    input.settings,
    input.boardSelections,
  );

  logger.info("Preparing import data in insert collections for database");

  const boardInsertCollection = createBoardInsertCollection({ preparedApps, preparedBoards }, input.settings);
  const userInsertCollection = createUserInsertCollection(importUsers, input.token);
  const integrationInsertCollection = createIntegrationInsertCollection(preparedIntegrations, input.token);

  logger.info("Inserting import data to database");

  // Due to a limitation with better-sqlite it's only possible to use it synchronously
  db.transaction((transaction) => {
    boardInsertCollection.insertAll(transaction);
    userInsertCollection.insertAll(transaction);
    integrationInsertCollection.insertAll(transaction);
  });

  logger.info(`Import successful (in ${stopwatch.getElapsedInHumanWords()})`);
};
