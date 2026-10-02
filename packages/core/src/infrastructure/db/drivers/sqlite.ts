import { Database } from "bun:sqlite";
import { drizzle as drizzleSqlite } from "drizzle-orm/bun-sqlite";

import { dbEnv } from "../env";
import type { SharedDrizzleConfig } from "./shared";

export const createSqliteDb = <TSchema extends Record<string, unknown>>(config: SharedDrizzleConfig<TSchema>) => {
  const connection = new Database(dbEnv.URL);
  return drizzleSqlite<TSchema>(connection, config);
};
