import type BetterSqlite3Db from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";

import { dbEnv } from "../env";
import type { SharedDrizzleConfig } from "./shared";

export const createSqliteDb = <TSchema extends Record<string, unknown>>(config: SharedDrizzleConfig<TSchema>) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
  const Database: typeof BetterSqlite3Db = require("better-sqlite3");
  const connection = new Database(dbEnv.URL);
  return drizzleSqlite<TSchema>(connection, config);
};
