import { isLibsql, isMysql, isPostgresql } from "./collection";
import type { HomarrDatabase, HomarrDatabaseMysql } from "./driver";
import type { MySqlSchema } from "./schema";
import * as schema from "./schema";

interface HandleTransactionInput {
  handleAsync: (db: HomarrDatabaseMysql, schema: MySqlSchema) => Promise<void>;
  handleSync: (db: HomarrDatabase) => void;
}

/**
 * The below method is mostly used to handle transactions in different database drivers.
 * - libsql, mysql2, and node-postgres use async transactions
 * - better-sqlite3 uses synchronous transactions (legacy support)
 */
export const handleDiffrentDbDriverOperationsAsync = async (db: HomarrDatabase, input: HandleTransactionInput) => {
  if (isLibsql() || isMysql() || isPostgresql()) {
    // libsql, MySQL, and PostgreSQL all use async transactions
    // Schema type is always the correct one based on env variables
    await input.handleAsync(db as unknown as HomarrDatabaseMysql, schema as unknown as MySqlSchema);
  } else {
    // better-sqlite3 (legacy) uses synchronous transactions
    input.handleSync(db);
  }
};
