import Database from "better-sqlite3";

import { database } from "./driver";

export * from "drizzle-orm";

export const db = database;

export type Database = typeof db;

export { createId } from "@paralleldrive/cuid2";
