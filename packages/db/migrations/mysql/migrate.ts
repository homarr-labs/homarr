import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2";

import type { Database } from "../..";
import { env } from "../../env";
import * as mysqlSchema from "../../schema/mysql";
import { seedDataAsync } from "../seed";

const migrationsFolder = process.argv[2] ?? ".";

const migrateAsync = async () => {
  const mysql2 = mysql.createConnection(
    env.DB_URL
      ? { uri: env.DB_URL }
      : {
          host: env.DB_HOST,
          database: env.DB_NAME,
          port: env.DB_PORT,
          user: env.DB_USER,
          password: env.DB_PASSWORD,
        },
  );

  const db = drizzle(mysql2, {
    mode: "default",
    schema: mysqlSchema,
    casing: "snake_case",
  });

  await migrate(db, { migrationsFolder });
  await seedDataAsync(db as unknown as Database);
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
