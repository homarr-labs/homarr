import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import { DB_CASING } from "@homarr/core/infrastructure/db/constants";

import * as sqliteSchema from "../schema/sqlite";

export const createDbAsync = async (debug?: boolean) => {
  const sqlite = createClient({
    url: ":memory:",
  });
  const db = drizzle(sqlite, { schema: sqliteSchema, logger: debug, casing: DB_CASING });
  await migrate(db, {
    migrationsFolder: "./packages/db/migrations/sqlite",
  });

  if (debug) {
    console.log("Database created");
  }

  return db;
};
