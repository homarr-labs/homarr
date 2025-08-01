import Database from "better-sqlite3";

import { database } from "./driver";

export * from "drizzle-orm";

export const db = database;

export type Database = typeof db;
export type { HomarrDatabaseMysql } from "./driver";

export { handleDiffrentDbDriverOperationsAsync as handleTransactionsAsync } from "./transactions";
