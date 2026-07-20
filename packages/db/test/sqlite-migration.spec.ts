import path from "path";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { test } from "vitest";

import { DB_CASING } from "@homarr/core/infrastructure/db/constants";

import type { Database } from "..";
import { seedDataAsync } from "../migrations/seed";
import * as sqliteSchema from "../schema/sqlite";
import { expectBundledCustomWidgetsSeeded } from "./custom-widget-seed-assertions";

test("SQLite migrations seed the four disabled bundled custom widgets", async () => {
  const connection = new BetterSqlite3(":memory:");
  const database = drizzle(connection, { schema: sqliteSchema, casing: DB_CASING });

  migrate(database, { migrationsFolder: path.join(__dirname, "..", "migrations", "sqlite") });
  await seedDataAsync(database as unknown as Database);

  await expectBundledCustomWidgetsSeeded(database as unknown as Database);

  connection.close();
});
