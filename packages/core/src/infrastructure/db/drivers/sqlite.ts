import { createClient } from "@libsql/client/node";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { drizzle as drizzleSqlite } from "drizzle-orm/libsql";

import { dbEnv } from "../env";
import type { SharedDrizzleConfig } from "./shared";

export const createSqliteDb = <TSchema extends Record<string, unknown>>(config: SharedDrizzleConfig<TSchema>) => {
  if (process.env.CI && !dbEnv.URL) {
    return null as unknown as LibSQLDatabase<TSchema>;
  }

  const connection = createClient({
    url: "file:" + dbEnv.URL,
  });
  return drizzleSqlite<TSchema>(connection, config);
};
