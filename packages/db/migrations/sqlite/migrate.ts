import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createSharedDbConfig, createSqliteDb } from "@homarr/core/infrastructure/db";

import * as sqliteSchema from "../../schema/sqlite";
import { applyCustomMigrationsAsync } from "../custom";
import { seedDataAsync } from "../seed";

const migrationsFolder = process.argv[2] ?? ".";

const migrateAsync = async () => {
  const config = createSharedDbConfig(sqliteSchema);
  const db = createSqliteDb(config);

  // SQLite cannot disable foreign keys inside Drizzle's migration transaction.
  // Board table rebuilds must not cascade-delete their layouts and widgets.
  db.$client.pragma("foreign_keys = OFF");
  try {
    migrate(db, { migrationsFolder });
  } finally {
    db.$client.pragma("foreign_keys = ON");
  }

  await seedDataAsync(db);
  await applyCustomMigrationsAsync(db);
};

migrateAsync()
  .then(() => {
    console.log("Migration complete");
    process.exit(0);
  })
  .catch((err) => {
    console.log("Migration failed", err);
    process.exit(1);
  });
