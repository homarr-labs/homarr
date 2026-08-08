import path from "path";
import { MySqlContainer } from "@testcontainers/mysql";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2";
import { describe, expect, test } from "vitest";

import { DB_CASING } from "@homarr/core/infrastructure/db/constants";

import * as mysqlSchema from "../schema/mysql";

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

    // Check if users table exists
    await database.query.users.findMany();

    // A single base64 image attachment already exceeds the 64KB that `text` holds on MySQL, so
    // `assistant_message.content` has to be `mediumtext`. Everything below 64KB passes either way.
    const largeContent = "x".repeat(200_000);
    await database.insert(mysqlSchema.users).values({ id: "size-check-user", name: "size-check" });
    await database.insert(mysqlSchema.assistantThreads).values({ id: "size-check-thread", userId: "size-check-user" });
    await database.insert(mysqlSchema.assistantMessages).values({
      id: "size-check-message",
      threadId: "size-check-thread",
      parentId: null,
      content: largeContent,
    });
    const [storedMessage] = await database.query.assistantMessages.findMany({
      where: eq(mysqlSchema.assistantMessages.id, "size-check-message"),
    });
    expect(storedMessage?.content).toHaveLength(largeContent.length);

    connection.end();
    await mysqlContainer.stop();
  }, 120_000);
});
