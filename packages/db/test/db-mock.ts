import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import { DB_CASING } from "@homarr/core/infrastructure/db/constants";

import * as sqliteSchema from "../schema/sqlite";

export const createDb = (debug?: boolean) => {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema: sqliteSchema, logger: debug, casing: DB_CASING });
  migrate(db, {
    migrationsFolder: "./packages/db/migrations/sqlite",
  });

  if (debug) {
    console.log("Database created");
  }

  return db;
};
