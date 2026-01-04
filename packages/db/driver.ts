import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { LibSQLDatabase, LibSQLTransaction } from "drizzle-orm/libsql";
import type { MySql2Database } from "drizzle-orm/mysql2";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type * as mysqlSchema from "./schema/mysql";
import type * as pgSchema from "./schema/postgresql";
import type * as sqliteSchema from "./schema/sqlite";

export type HomarrDatabase = LibSQLDatabase<typeof sqliteSchema>;
export type HomarrTransaction = LibSQLTransaction<typeof sqliteSchema, ExtractTablesWithRelations<typeof sqliteSchema>>;
export type HomarrDatabaseMysql = MySql2Database<typeof mysqlSchema>;
export type HomarrDatabasePostgresql = NodePgDatabase<typeof pgSchema>;
