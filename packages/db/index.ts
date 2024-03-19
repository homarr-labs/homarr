import Database from "better-sqlite3";

import { database } from "./driver";
import * as sqliteSchema from "./schema/sqlite";

// Export only the types from the sqlite schema as we're using that.
export const schema = sqliteSchema;

export * from "drizzle-orm";

export const db = database;

export type Database = typeof db;

export { createId } from "@paralleldrive/cuid2";
