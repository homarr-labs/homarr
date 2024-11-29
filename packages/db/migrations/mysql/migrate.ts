/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2";

import type { Database } from "../..";
import * as mysqlSchema from "../../schema/mysql";
import { seedDataAsync } from "../seed";

const migrationsFolder = process.argv[2] ?? ".";

const migrateAsync = async () => {
  const mysql2 = mysql.createConnection(
    process.env.DB_HOST
      ? {
          host: process.env.DB_HOST,
          database: process.env.DB_NAME!,
          port: Number(process.env.DB_PORT),
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
        }
      : { uri: process.env.DB_URL },
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
