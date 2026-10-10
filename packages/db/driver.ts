import type { Changes } from "bun:sqlite";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type * as pgSchema from "./schema/postgresql";
import type * as sqliteSchema from "./schema/sqlite";

export type HomarrDatabase = BaseSQLiteDatabase<"sync", Changes, typeof sqliteSchema>;
export type HomarrDatabasePostgresql = NodePgDatabase<typeof pgSchema>;
