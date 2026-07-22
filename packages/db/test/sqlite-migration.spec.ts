import path from "path";
import { readFileSync } from "node:fs";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";

import { DB_CASING } from "@homarr/core/infrastructure/db/constants";

import type { Database } from "..";
import { seedDataAsync } from "../migrations/seed";
import * as sqliteSchema from "../schema/sqlite";
import { expectBundledCustomWidgetsSeeded } from "./custom-widget-seed-assertions";

test("SQLite migrations seed the five disabled bundled custom widgets", async () => {
  const connection = new BetterSqlite3(":memory:");
  const database = drizzle(connection, { schema: sqliteSchema, casing: DB_CASING });

  migrate(database, { migrationsFolder: path.join(__dirname, "..", "migrations", "sqlite") });
  await seedDataAsync(database as unknown as Database);

  await expectBundledCustomWidgetsSeeded(database as unknown as Database);

  connection.close();
});

test("Custom JSX v2 migration preserves populated v1 definitions and secrets", () => {
  const connection = new BetterSqlite3(":memory:");
  connection.exec(`
    CREATE TABLE user (id text PRIMARY KEY NOT NULL);
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
  `);

  const migration = readFileSync(
    path.join(__dirname, "..", "migrations", "sqlite", "0042_custom_widget_v2_reset.sql"),
    "utf8",
  );
  for (const statement of migration
    .split("--> statement-breakpoint")
    .map((value) => value.trim())
    .filter(Boolean)) {
    connection.exec(statement);
  }

  expect(connection.prepare("SELECT * FROM legacy_custom_widget_definition").get()).toMatchObject({
    id: "legacy-weather",
    name: "Weather",
    enabled: 1,
    creator_id: "owner",
  });
  expect(connection.prepare("SELECT * FROM legacy_custom_widget_secret").get()).toMatchObject({
    definition_id: "legacy-weather",
    kind: "apiKey",
    value: "encrypted.value",
  });
  expect(connection.prepare("SELECT count(*) AS count FROM custom_widget_definition").get()).toEqual({ count: 0 });
  expect(connection.prepare("SELECT count(*) AS count FROM custom_widget_secret").get()).toEqual({ count: 0 });

  connection.close();
});
