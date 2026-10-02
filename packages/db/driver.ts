import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type * as pgSchema from "./schema/postgresql";
import type * as sqliteSchema from "./schema/sqlite";

export type HomarrDatabase = BunSQLiteDatabase<typeof sqliteSchema>;
export type HomarrDatabasePostgresql = NodePgDatabase<typeof pgSchema>;
