import { createClient } from "@libsql/client";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { dbEnv } from "../env";
import type { SharedDrizzleConfig } from "./shared";

export const createNewSqliteDb = <TSchema extends Record<string, unknown>>(config: SharedDrizzleConfig<TSchema>) => {
  const connection = createClient({
    // TODO: handle file prefix
    url: 'file://' + dbEnv.URL,
  });
  return drizzleLibsql<TSchema>(connection, config);
};
