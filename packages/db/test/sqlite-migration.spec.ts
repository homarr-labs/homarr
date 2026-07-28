import path from "path";
import { readFileSync } from "node:fs";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import SuperJSON from "superjson";
import { expect, test } from "vitest";

import { DB_CASING } from "@homarr/core/infrastructure/db/constants";

import type { Database } from "..";
import { seedDataAsync } from "../migrations/seed";
import * as sqliteSchema from "../schema/sqlite";
import { expectBundledCustomWidgetsSeeded } from "./custom-widget-seed-assertions";

const applyMigration = (connection: BetterSqlite3.Database, fileName: string) => {
  const migration = readFileSync(path.join(__dirname, "..", "migrations", "sqlite", fileName), "utf8");
  for (const statement of migration
    .split("--> statement-breakpoint")
    .map((value) => value.trim())
    .filter(Boolean)) {
    connection.exec(statement);
  }
};

test("SQLite migrations seed the five disabled bundled custom widgets", async () => {
  const connection = new BetterSqlite3(":memory:");
  const database = drizzle(connection, { schema: sqliteSchema, casing: DB_CASING });

  migrate(database, { migrationsFolder: path.join(__dirname, "..", "migrations", "sqlite") });
  await seedDataAsync(database as unknown as Database);

  await expectBundledCustomWidgetsSeeded(database as unknown as Database);
  expect(
    connection
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'custom_widget%' ORDER BY name")
      .all(),
  ).toEqual([
    { name: "custom_widget_definition" },
    { name: "custom_widget_secret" },
    { name: "custom_widget_v2_definition" },
    { name: "custom_widget_v2_secret" },
  ]);

  connection.close();
});

test("Custom JSX compatibility migration preserves v1 and already-created v2 data", () => {
  const connection = new BetterSqlite3(":memory:");
  const legacyPlacementOptions = SuperJSON.stringify({ definitionId: "legacy-weather", refreshInterval: 30 });
  connection.exec(`
    CREATE TABLE user (id text PRIMARY KEY NOT NULL);
    CREATE TABLE groupPermission (
      group_id text NOT NULL,
      permission text NOT NULL
    );
    CREATE TABLE item (
      id text PRIMARY KEY NOT NULL,
      kind text NOT NULL,
      options text NOT NULL
    );
    CREATE TABLE custom_widget_definition (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      description text,
      icon_url text,
      url text NOT NULL,
      auth_type text DEFAULT 'none' NOT NULL,
      header_name text,
      method text DEFAULT 'GET' NOT NULL,
      request_body text,
      display_type text DEFAULT 'singleValue' NOT NULL,
      display_config text DEFAULT '{}' NOT NULL,
      enabled integer DEFAULT true NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL,
      creator_id text REFERENCES user(id) ON DELETE SET NULL
    );
    CREATE TABLE custom_widget_secret (
      kind text NOT NULL,
      value text NOT NULL,
      updated_at integer NOT NULL,
      definition_id text NOT NULL REFERENCES custom_widget_definition(id) ON DELETE CASCADE,
      PRIMARY KEY(definition_id, kind)
    );
    INSERT INTO user (id) VALUES ('owner');
    INSERT INTO custom_widget_definition (
      id, name, url, auth_type, method, display_type, display_config, enabled, created_at, updated_at, creator_id
    ) VALUES ('legacy-weather', 'Weather', 'https://example.test/weather', 'bearer', 'GET', 'singleValue',
      '{"type":"singleValue","jsonPath":"$.temperature"}', true, 1700000000, 1700000001, 'owner');
    INSERT INTO custom_widget_secret (kind, value, updated_at, definition_id)
    VALUES ('apiKey', 'encrypted.value', 1700000001, 'legacy-weather');
    INSERT INTO groupPermission (group_id, permission) VALUES
      ('editors', 'custom-widget-manage'),
      ('editors', 'custom-widget-secret-write'),
      ('editors', 'board-create');
  `);
  connection
    .prepare("INSERT INTO item (id, kind, options) VALUES ('weather-item', 'customApi', ?)")
    .run(legacyPlacementOptions);

  applyMigration(connection, "0042_custom_widget_v2_reset.sql");
  connection.exec(`
    INSERT INTO custom_widget_definition (
      id, name, sources, requests, options, template, enabled, created_at, updated_at, creator_id
    ) VALUES (
      'legacy-weather', 'Weather v2', '[]', '[]', '[]', '<Text>Weather</Text>', true,
      1700000002, 1700000003, 'owner'
    );
    INSERT INTO custom_widget_secret (source_id, kind, encrypted_value, updated_at, definition_id)
    VALUES ('weather', 'apiKey', 'encrypted.v2-value', 1700000003, 'legacy-weather');
  `);
  applyMigration(connection, "0043_custom_widget_v1_compatibility.sql");

  expect(connection.prepare("SELECT * FROM custom_widget_definition").get()).toMatchObject({
    id: "legacy-weather",
    name: "Weather",
    url: "https://example.test/weather",
    enabled: 1,
    creator_id: "owner",
  });
  expect(connection.prepare("SELECT * FROM custom_widget_secret").get()).toMatchObject({
    definition_id: "legacy-weather",
    kind: "apiKey",
    value: "encrypted.value",
  });
  expect(connection.prepare("SELECT * FROM custom_widget_v2_definition").get()).toMatchObject({
    id: "legacy-weather",
    name: "Weather v2",
    template: "<Text>Weather</Text>",
  });
  expect(connection.prepare("SELECT * FROM custom_widget_v2_secret").get()).toMatchObject({
    definition_id: "legacy-weather",
    source_id: "weather",
    encrypted_value: "encrypted.v2-value",
  });
  expect(connection.prepare("SELECT options FROM item WHERE id = 'weather-item'").get()).toEqual({
    options: legacyPlacementOptions,
  });
  expect(connection.prepare("SELECT permission FROM groupPermission ORDER BY permission").all()).toEqual([
    { permission: "board-create" },
  ]);
  expect(
    connection
      .prepare(
        `SELECT id, name, url, auth_type, header_name, method, request_body, display_type, display_config,
          enabled, created_at, updated_at, creator_id
        FROM custom_widget_definition`,
      )
      .get(),
  ).toMatchObject({
    id: "legacy-weather",
    auth_type: "bearer",
    display_type: "singleValue",
  });
  expect(
    connection
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'legacy_custom_widget%' ORDER BY name",
      )
      .all(),
  ).toEqual([]);

  connection.close();
});
