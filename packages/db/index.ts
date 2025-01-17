import Database from "better-sqlite3";

import { database } from "./driver";

export * from "drizzle-orm";

export const db = database;

export type Database = typeof db;
export type { HomarrDatabaseMysql } from "./driver";

export { createId } from "@paralleldrive/cuid2";
export { handleTransactionsAsync } from "./transactions";
