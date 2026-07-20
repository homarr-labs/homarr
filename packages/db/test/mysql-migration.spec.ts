import path from "path";
import { MySqlContainer } from "@testcontainers/mysql";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2";
import { describe, expect, test } from "vitest";

import { DB_CASING } from "@homarr/core/infrastructure/db/constants";

import * as mysqlSchema from "../schema/mysql";
import type { Database } from "..";
import { seedDataAsync } from "../migrations/seed";

describe("Mysql Migration", () => {
  test("should add all tables and keys specified in migration files", async () => {
    const mysqlContainer = await new MySqlContainer("mysql:latest").start();

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
      casing: DB_CASING,
    });

    // Run migrations and check if it works
    await migrate(database, {
      migrationsFolder: path.join(__dirname, "..", "migrations", "mysql"),
    });
    await seedDataAsync(database as unknown as Database);

    // Check if users table exists
    await database.query.users.findMany();
    const bundledWidgets = await database.query.customWidgetDefinitions.findMany({
      where: (table, { like }) => like(table.id, "seed-%"),
    });
    expect(bundledWidgets).toHaveLength(4);
    expect(bundledWidgets.every(({ enabled }) => !enabled)).toBe(true);

    connection.end();
    await mysqlContainer.stop();
  }, 40_000);
});
