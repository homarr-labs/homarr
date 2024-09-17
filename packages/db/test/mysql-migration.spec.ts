import path from "path";
import { MySqlContainer } from "@testcontainers/mysql";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2";
import { describe, test } from "vitest";

import * as mysqlSchema from "../schema/mysql";

describe("Mysql Migration", () => {
  test("should run successfully", async () => {
    const mysqlContainer = await new MySqlContainer().start();

    const connection = mysql.createConnection({
      host: mysqlContainer.getHost(),
      database: mysqlContainer.getDatabase(),
      port: mysqlContainer.getPort(),
      user: mysqlContainer.getUsername(),
      password: mysqlContainer.getUserPassword(),
    });

    const database = drizzle(connection, {
      schema: mysqlSchema,
      mode: "default",
    });

    // Run migrations and check if it works
    await migrate(database, {
      migrationsFolder: path.join(__dirname, "..", "migrations", "mysql"),
    });

    // Check if users table exists
    await database.query.users.findMany();

    connection.end();
    await mysqlContainer.stop();
  }, 40_000);
});
