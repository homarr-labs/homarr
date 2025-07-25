import { isMysql, isPostgresql } from "./collection";
import type { HomarrDatabase, HomarrDatabaseMysql, HomarrDatabasePostgresql } from "./driver";
// import { env } from "./env";
import * as mysqlSchema from "./schema/mysql";
import * as pgSchema from "./schema/postgresql";
import type { typeOfHomarrDatabase } from "./driver";

type MysqlSchema = typeof mysqlSchema;
type PostgresqlSchema = typeof pgSchema;

interface HandleTransactionInput {
  handleAsync: (
    db: HomarrDatabaseMysql,
    schema: MysqlSchema,
  ) => Promise<void>;
  handlePostgresqlAsync: (
    db: HomarrDatabasePostgresql,
    schema: PostgresqlSchema,
  ) => Promise<void>;
  handleSync: (db: HomarrDatabase) => void;
}

/**
 * The below method is mostly used to handle transactions in different database drivers.
 * As better-sqlite3 transactions have to be synchronous, we have to implement them in a different way.
 * But it can also generally be used when dealing with different database drivers.
 */
export const handleDiffrentDbDriverOperationsAsync = async (db: typeOfHomarrDatabase, input: HandleTransactionInput) => {
  if (isMysql(db)) {
    await input.handleAsync(db as unknown as HomarrDatabaseMysql, mysqlSchema);
  } else if (isPostgresql(db)) {
    await input.handlePostgresqlAsync(db as unknown as HomarrDatabasePostgresql, pgSchema);
  } else {
    input.handleSync(db);
  }
};
