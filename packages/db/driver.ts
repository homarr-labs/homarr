import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { SqliteDatabase } from "@homarr/core/infrastructure/db";

import type * as pgSchema from "./schema/postgresql";
import type * as sqliteSchema from "./schema/sqlite";

export type HomarrDatabase = SqliteDatabase<typeof sqliteSchema>;
export type HomarrDatabasePostgresql = NodePgDatabase<typeof pgSchema>;
