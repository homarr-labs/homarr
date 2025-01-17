import type { HomarrDatabase, HomarrDatabaseMysql } from "./driver";
import { env } from "./env";
import * as mysqlSchema from "./schema/mysql";

type MysqlSchema = typeof mysqlSchema;

interface HandleTransactionInput {
  handleAsync: (db: HomarrDatabaseMysql, schema: MysqlSchema) => Promise<void>;
  handleSync: (db: HomarrDatabase) => void;
}

export const handleTransactionsAsync = async (db: HomarrDatabase, input: HandleTransactionInput) => {
  if (env.DB_DRIVER === "better-sqlite3") {
    input.handleSync(db);
    return;
  }

  await input.handleAsync(db as unknown as HomarrDatabaseMysql, mysqlSchema);
};
