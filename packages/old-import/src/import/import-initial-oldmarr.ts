import type { z } from "zod";

import { Stopwatch } from "@homarr/common";
import { handleTransactionsAsync } from "@homarr/db";
import type { Database } from "@homarr/db";
import { logger } from "@homarr/log";

import { typeOfHomarrDatabase } from "../../../db/driver";
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

  await handleTransactionsAsync(db, {
    async handleAsync(db) {
      await db.transaction(async (transaction) => {
        await boardInsertCollection.insertAllAsync(transaction as typeOfHomarrDatabase);
        await userInsertCollection.insertAllAsync(transaction as typeOfHomarrDatabase);
        await integrationInsertCollection.insertAllAsync(transaction as typeOfHomarrDatabase);
      });
    },
    async handlePostgresqlAsync(db) {
      await db.transaction(async (transaction) => {
        await boardInsertCollection.insertAllAsync(transaction as typeOfHomarrDatabase);
        await userInsertCollection.insertAllAsync(transaction as typeOfHomarrDatabase);
        await integrationInsertCollection.insertAllAsync(transaction as typeOfHomarrDatabase);
      });
    },
    handleSync(db) {
      db.transaction((transaction) => {
        boardInsertCollection.insertAll(transaction as typeOfHomarrDatabase);
        userInsertCollection.insertAll(transaction as typeOfHomarrDatabase);
        integrationInsertCollection.insertAll(transaction as typeOfHomarrDatabase);
      });
    },
  });

  logger.info(`Import successful (in ${stopwatch.getElapsedInHumanWords()})`);
};
