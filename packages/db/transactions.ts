import type { HomarrDatabase, HomarrDatabaseMysql } from "./driver";
import { env } from "./env";
import * as mysqlSchema from "./schema/mysql";

type MysqlSchema = typeof mysqlSchema;

interface HandleTransactionInput {
  handleAsync: (db: HomarrDatabaseMysql, schema: MysqlSchema) => Promise<void>;
  handleSync: (db: HomarrDatabase) => void;
}

/**
 * The below method is mostly used to handle transactions in different database drivers.
 * As better-sqlite3 transactions have to be synchronous, we have to implement them in a different way.
 * But it can also generally be used when dealing with different database drivers.
 */
export const handleDiffrentDbDriverOperationsAsync = async (db: HomarrDatabase, input: HandleTransactionInput) => {
  if (env.DB_DRIVER !== "mysql2") {
    input.handleSync(db);
    return;
  }

  await input.handleAsync(db as unknown as HomarrDatabaseMysql, mysqlSchema);
};
