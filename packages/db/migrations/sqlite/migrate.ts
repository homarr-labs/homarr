import { createSharedDbConfig, openSqliteDatabase } from "@homarr/core/infrastructure/db";
import { dbEnv } from "@homarr/core/infrastructure/db/env";

import * as sqliteSchema from "../../schema/sqlite";
import { applyCustomMigrationsAsync } from "../custom";
import { seedDataAsync } from "../seed";

const migrationsFolder = process.argv[2] ?? ".";

const migrateAsync = async () => {
  const config = createSharedDbConfig(sqliteSchema);
  const connection = openSqliteDatabase(dbEnv.URL, config);
  const db = connection.db;

  // SQLite cannot disable foreign keys inside Drizzle's migration transaction.
  // Board table rebuilds must not cascade-delete their layouts and widgets.
  connection.connection.exec("PRAGMA foreign_keys = OFF");
  try {
    connection.migrate({ migrationsFolder });
  } finally {
    connection.connection.exec("PRAGMA foreign_keys = ON");
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
