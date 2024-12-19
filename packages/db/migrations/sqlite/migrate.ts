import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { schema } from "../..";
import { env } from "../../env";
import { seedDataAsync } from "../seed";

const migrationsFolder = process.argv[2] ?? ".";

const migrateAsync = async () => {
  const sqlite = new Database(env.DB_URL.replace("file:", ""));

  const db = drizzle(sqlite, { schema, casing: "snake_case" });

  migrate(db, { migrationsFolder });

  await seedDataAsync(db);
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
