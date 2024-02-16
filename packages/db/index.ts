import Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as sqliteSchema from "./schema/sqlite";

export const schema = sqliteSchema;

export * from "drizzle-orm";

export const sqlite = new Database(process.env.DB_URL);

export const db = drizzle(sqlite, { schema });

export type Database = BetterSQLite3Database<typeof schema>;

export { createId } from "@paralleldrive/cuid2";
