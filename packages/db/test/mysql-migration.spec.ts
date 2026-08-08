import path from "path";
import { readFileSync } from "node:fs";
import { MySqlContainer } from "@testcontainers/mysql";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2";
import SuperJSON from "superjson";
import { describe, expect, test } from "vitest";

import { DB_CASING } from "@homarr/core/infrastructure/db/constants";

import * as mysqlSchema from "../schema/mysql";
import type { Database } from "..";
import { seedDataAsync } from "../migrations/seed";
import { expectBundledCustomWidgetsSeeded } from "./custom-widget-seed-assertions";

const applyMigration = async (connection: mysql.Connection, fileName: string) => {
  const migration = readFileSync(path.join(__dirname, "..", "migrations", "mysql", fileName), "utf8");
  for (const statement of migration
    .split("--> statement-breakpoint")
    .map((value) => value.trim())
    .filter(Boolean)) {
    await connection.promise().query(statement);
  }
};

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
    await expectBundledCustomWidgetsSeeded(database as unknown as Database);
    const [customWidgetTables] = await connection
      .promise()
      .query<mysql.RowDataPacket[]>("SHOW TABLES LIKE 'custom_widget%'");
    expect(customWidgetTables).toHaveLength(4);

    connection.end();
    await mysqlContainer.stop();
  }, 120_000);

  test("Custom Widget v2 migration preserves v1 data and board references", async () => {
    const mysqlContainer = await new MySqlContainer("mysql:latest").start();
    const connection = mysql.createConnection({
      host: mysqlContainer.getHost(),
      database: mysqlContainer.getDatabase(),
      port: mysqlContainer.getPort(),
      user: mysqlContainer.getUsername(),
      password: mysqlContainer.getUserPassword(),
      multipleStatements: true,
    });
    const sql = connection.promise();
    try {
      const legacyPlacementOptions = SuperJSON.stringify({ definitionId: "legacy-weather", refreshInterval: 30 });
      await sql.query(`
        CREATE TABLE \`user\` (\`id\` varchar(64) NOT NULL PRIMARY KEY);
        CREATE TABLE \`groupPermission\` (
          \`group_id\` varchar(64) NOT NULL,
          \`permission\` text NOT NULL
        );
        CREATE TABLE \`item\` (
          \`id\` varchar(64) NOT NULL PRIMARY KEY,
          \`kind\` varchar(64) NOT NULL,
          \`options\` text NOT NULL
        );
        CREATE TABLE \`custom_widget_definition\` (
          \`id\` varchar(64) NOT NULL PRIMARY KEY,
          \`name\` varchar(256) NOT NULL,
          \`description\` text,
          \`icon_url\` text,
          \`url\` text NOT NULL,
          \`auth_type\` varchar(32) NOT NULL DEFAULT 'none',
          \`header_name\` varchar(256),
          \`method\` varchar(16) NOT NULL DEFAULT 'GET',
          \`request_body\` text,
          \`display_type\` varchar(32) NOT NULL DEFAULT 'singleValue',
          \`display_config\` text NOT NULL,
          \`enabled\` boolean NOT NULL DEFAULT true,
          \`created_at\` timestamp NOT NULL,
          \`updated_at\` timestamp NOT NULL,
          \`creator_id\` varchar(64),
          CONSTRAINT \`custom_widget_definition_creator_id_user_id_fk\`
            FOREIGN KEY (\`creator_id\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL
        );
        CREATE TABLE \`custom_widget_secret\` (
          \`kind\` varchar(64) NOT NULL,
          \`value\` text NOT NULL,
          \`updated_at\` timestamp NOT NULL,
          \`definition_id\` varchar(64) NOT NULL,
          PRIMARY KEY (\`definition_id\`, \`kind\`),
          CONSTRAINT \`cw_secret_definition_id_cw_definition_id_fk\`
            FOREIGN KEY (\`definition_id\`) REFERENCES \`custom_widget_definition\`(\`id\`) ON DELETE CASCADE
        );
        INSERT INTO \`user\` (\`id\`) VALUES ('owner');
        INSERT INTO \`custom_widget_definition\` (
          \`id\`, \`name\`, \`url\`, \`auth_type\`, \`method\`, \`display_type\`, \`display_config\`,
          \`enabled\`, \`created_at\`, \`updated_at\`, \`creator_id\`
        ) VALUES (
          'legacy-weather', 'Weather', 'https://example.test/weather', 'bearer', 'GET', 'singleValue',
          '{"type":"singleValue","jsonPath":"$.temperature"}', true,
          '2023-11-14 00:00:00', '2023-11-14 00:00:01', 'owner'
        );
        INSERT INTO \`custom_widget_secret\` (\`kind\`, \`value\`, \`updated_at\`, \`definition_id\`)
        VALUES ('apiKey', 'encrypted.value', '2023-11-14 00:00:01', 'legacy-weather');
        INSERT INTO \`groupPermission\` (\`group_id\`, \`permission\`) VALUES
          ('editors', 'custom-widget-manage'),
          ('editors', 'custom-widget-secret-write'),
          ('editors', 'board-create');
      `);
      await sql.execute("INSERT INTO `item` (`id`, `kind`, `options`) VALUES ('weather-item', 'customApi', ?)", [
        legacyPlacementOptions,
      ]);

      await applyMigration(connection, "0044_custom_widget_v2_tables.sql");
      await sql.query(`
        INSERT INTO \`custom_widget_v2_definition\` (
          \`id\`, \`name\`, \`sources\`, \`requests\`, \`options\`, \`template\`, \`enabled\`,
          \`created_at\`, \`updated_at\`, \`creator_id\`
        ) VALUES (
          'legacy-weather', 'Weather v2', '[]', '[]', '[]', '<Text>Weather</Text>', true,
          '2023-11-14 00:00:02', '2023-11-14 00:00:03', 'owner'
        );
        INSERT INTO \`custom_widget_v2_secret\` (
          \`source_id\`, \`kind\`, \`encrypted_value\`, \`updated_at\`, \`definition_id\`
        ) VALUES ('weather', 'apiKey', 'encrypted.v2-value', '2023-11-14 00:00:03', 'legacy-weather');
      `);

      const [definitions] = await sql.query<mysql.RowDataPacket[]>(
        "SELECT id, name, url, enabled, creator_id FROM custom_widget_definition",
      );
      const [secrets] = await sql.query<mysql.RowDataPacket[]>(
        "SELECT definition_id, kind, value FROM custom_widget_secret",
      );
      expect(definitions).toEqual([
        expect.objectContaining({
          id: "legacy-weather",
          name: "Weather",
          url: "https://example.test/weather",
          enabled: 1,
          creator_id: "owner",
        }),
      ]);
      expect(secrets).toEqual([
        expect.objectContaining({ definition_id: "legacy-weather", kind: "apiKey", value: "encrypted.value" }),
      ]);
      const [v2Definitions] = await sql.query<mysql.RowDataPacket[]>(
        "SELECT id, name, template FROM custom_widget_v2_definition",
      );
      const [v2Secrets] = await sql.query<mysql.RowDataPacket[]>(
        "SELECT definition_id, source_id, kind, encrypted_value FROM custom_widget_v2_secret",
      );
      expect(v2Definitions).toEqual([
        expect.objectContaining({ id: "legacy-weather", name: "Weather v2", template: "<Text>Weather</Text>" }),
      ]);
      expect(v2Secrets).toEqual([
        expect.objectContaining({
          definition_id: "legacy-weather",
          source_id: "weather",
          kind: "apiKey",
          encrypted_value: "encrypted.v2-value",
        }),
      ]);
      const [items] = await sql.query<mysql.RowDataPacket[]>("SELECT options FROM item WHERE id = 'weather-item'");
      expect(items).toEqual([{ options: legacyPlacementOptions }]);
      const [permissions] = await sql.query<mysql.RowDataPacket[]>(
        "SELECT permission FROM groupPermission ORDER BY permission",
      );
      expect(permissions).toEqual([{ permission: "board-create" }]);
      const [v1Columns] = await sql.query<mysql.RowDataPacket[]>("SHOW COLUMNS FROM custom_widget_definition");
      expect(v1Columns.map((column) => column.Field)).toEqual(
        expect.arrayContaining(["id", "url", "auth_type", "display_type", "display_config"]),
      );
      expect(v1Columns.map((column) => column.Field)).not.toContain("sources");
      const [legacyTables] = await sql.query<mysql.RowDataPacket[]>("SHOW TABLES LIKE 'legacy_custom_widget%'");
      expect(legacyTables).toEqual([]);
    } finally {
      await sql.end();
      await mysqlContainer.stop();
    }
  }, 120_000);
});
