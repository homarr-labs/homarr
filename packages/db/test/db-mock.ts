import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { schema } from "..";

export const createDb = (debug?: boolean) => {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema, logger: debug });
  migrate(db, {
    migrationsFolder: "./packages/db/migrations/sqlite",
  });

  if (debug) {
    console.log("Database created");
  }

  return db;
};
