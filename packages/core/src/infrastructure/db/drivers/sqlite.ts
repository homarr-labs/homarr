import { createClient } from "@libsql/client";
import { drizzle as drizzleSqlite } from "drizzle-orm/libsql";

import { dbEnv } from "../env";
import type { SharedDrizzleConfig } from "./shared";

export const createSqliteDb = <TSchema extends Record<string, unknown>>(config: SharedDrizzleConfig<TSchema>) => {
  const client = createClient({ url: `file:${dbEnv.URL}` });
  return drizzleSqlite<TSchema>(client, config);
};
