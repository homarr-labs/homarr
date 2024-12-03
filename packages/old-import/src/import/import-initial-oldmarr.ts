import type { z } from "zod";

import type { Database } from "@homarr/db";

import { analyseOldmarrImportAsync } from "../analyse/analyse-oldmarr-import";
import { prepareMultipleImports } from "../prepare/prepare-multiple";
import { createBoardInsertCollection } from "./collections/board-collection";
import { createIntegrationInsertCollection } from "./collections/integration-collection";
import { createUserInsertCollection } from "./collections/user-collection";
import type { importInitialOldmarrInputSchema } from "./input";

export const importInitialOldmarrAsync = async (
  db: Database,
  input: z.infer<typeof importInitialOldmarrInputSchema>,
) => {
  const { checksum, configs, users: importUsers } = await analyseOldmarrImportAsync(input.file);
  await validateChecksumAsync(checksum, input.token);

  const { preparedApps, preparedBoards, preparedIntegrations } = prepareMultipleImports(
    configs,
    input.settings,
    input.boardSelections,
  );

  const boardInsertCollection = createBoardInsertCollection({ preparedApps, preparedBoards }, input.settings);
  const userInsertCollection = createUserInsertCollection(importUsers, input.token);
  const integrationInsertCollection = createIntegrationInsertCollection(preparedIntegrations, input.token);

  // Due to a limitation with better-sqlite it's only possible to use it synchronously
  db.transaction((transaction) => {
    boardInsertCollection.insertAll(transaction);
    userInsertCollection.insertAll(transaction);
    integrationInsertCollection.insertAll(transaction);
  });
};

const validateChecksumAsync = async (checksum: string | undefined, token: string | null) => {};

// TODO: Add note about screen size feature no longer exists
