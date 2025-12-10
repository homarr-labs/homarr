import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import type { Database } from "../..";
import { env } from "../../env";
import * as pgSchema from "../../schema/postgresql";
import { applyCustomMigrationsAsync } from "../custom";
import { seedDataAsync } from "../seed";

const migrationsFolder = process.argv[2] ?? ".";

const migrateAsync = async () => {
  const pool = new Pool(
    env.DB_URL
      ? { connectionString: env.DB_URL }
      : {
          host: env.DB_HOST,
          database: env.DB_NAME,
          port: env.DB_PORT,
          user: env.DB_USER,
          password: env.DB_PASSWORD,
        },
  );

  const db = drizzle({
    schema: pgSchema,
    casing: "snake_case",
    client: pool,
  });

  await migrate(db, { migrationsFolder });
  await seedDataAsync(db as unknown as Database);
  await applyCustomMigrationsAsync(db as unknown as Database);
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
