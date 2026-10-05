import { isPostgresql } from "./collection";
import type { HomarrDatabase, HomarrDatabasePostgresql } from "./driver";
import type { PostgreSqlSchema } from "./schema";
import * as schema from "./schema";

interface HandleTransactionInput {
  handleAsync: (db: HomarrDatabasePostgresql, schema: PostgreSqlSchema) => Promise<void>;
  handleSync: (db: HomarrDatabase) => void;
}

/**
 * The below method is mostly used to handle transactions in different database drivers.
 * As better-sqlite3 transactions have to be synchronous, we have to implement them in a different way.
 * But it can also generally be used when dealing with different database drivers.
 */
export const handleDiffrentDbDriverOperationsAsync = async (db: HomarrDatabase, input: HandleTransactionInput) => {
  if (isPostgresql()) {
    // Schema type is always the correct one based on env variables
    await input.handleAsync(db as unknown as HomarrDatabasePostgresql, schema as unknown as PostgreSqlSchema);
  } else {
    input.handleSync(db);
  }
};
