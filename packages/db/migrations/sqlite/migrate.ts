import { migrate } from "drizzle-orm/libsql/migrator";

import { createSharedDbConfig, createSqliteDb } from "@homarr/core/infrastructure/db";

import * as sqliteSchema from "../../schema/sqlite";
import { applyCustomMigrationsAsync } from "../custom";
import { seedDataAsync } from "../seed";

const migrationsFolder = process.argv[2] ?? ".";

const migrateAsync = async () => {
  const config = createSharedDbConfig(sqliteSchema);
  const db = createSqliteDb(config);

  await migrate(db, { migrationsFolder });

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
