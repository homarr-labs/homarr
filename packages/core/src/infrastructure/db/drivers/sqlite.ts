import { createClient } from "@libsql/client/node";
import { drizzle as drizzleSqlite } from "drizzle-orm/libsql";

import { dbEnv } from "../env";
import type { SharedDrizzleConfig } from "./shared";

export const createSqliteDb = <TSchema extends Record<string, unknown>>(config: SharedDrizzleConfig<TSchema>) => {
  const connection = createClient({
    url: "file:" + (dbEnv.URL || "/appdata/db/db.sqlite"),
  });
  return drizzleSqlite<TSchema>(connection, config);
};
