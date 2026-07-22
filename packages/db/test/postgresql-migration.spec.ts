import path from "path";
import { readFileSync } from "node:fs";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { describe, expect, test } from "vitest";

import { DB_CASING } from "@homarr/core/infrastructure/db/constants";

import * as pgSchema from "../schema/postgresql";
import type { Database } from "..";
import { seedDataAsync } from "../migrations/seed";
import { expectBundledCustomWidgetsSeeded } from "./custom-widget-seed-assertions";

describe("PostgreSql Migration", () => {
  test("should add all tables and keys specified in migration files", async () => {
    const container = new PostgreSqlContainer("postgres:latest");
    const postgreSqlContainer = await container.start();

    const pool = new Pool({
      user: postgreSqlContainer.getUsername(),
      database: postgreSqlContainer.getDatabase(),
      password: postgreSqlContainer.getPassword(),
      port: postgreSqlContainer.getPort(),
      host: postgreSqlContainer.getHost(),
      keepAlive: true,
      max: 0,
      idleTimeoutMillis: 60000,
      allowExitOnIdle: false,
    });

    const database = drizzle({
      schema: pgSchema,
      casing: DB_CASING,
      client: pool,
    });

    // Run migrations and check if it works
    await migrate(database, {
      migrationsFolder: path.join(__dirname, "..", "migrations", "postgresql"),
    });
    await seedDataAsync(database as unknown as Database);

    // Check if users table exists
    await database.query.users.findMany();
    await expectBundledCustomWidgetsSeeded(database as unknown as Database);

    // Close the pool to release resources
    await pool.end();
    // Stop the container
    await postgreSqlContainer.stop();
  }, 40_000);

  test("preserves populated v1 custom widgets and encrypted secrets", async () => {
    const postgreSqlContainer = await new PostgreSqlContainer("postgres:latest").start();
    const pool = new Pool({
      user: postgreSqlContainer.getUsername(),
      database: postgreSqlContainer.getDatabase(),
      password: postgreSqlContainer.getPassword(),
      port: postgreSqlContainer.getPort(),
      host: postgreSqlContainer.getHost(),
    });
    try {
      await pool.query(`
        CREATE TABLE "user" ("id" varchar(64) PRIMARY KEY NOT NULL);
        CREATE TABLE "custom_widget_definition" (
          "id" varchar(64) PRIMARY KEY NOT NULL,
          "name" varchar(256) NOT NULL,
          "description" text,
          "icon_url" text,
          "url" text NOT NULL,
          "auth_type" varchar(32) DEFAULT 'none' NOT NULL,
          "header_name" varchar(256),
          "method" varchar(16) DEFAULT 'GET' NOT NULL,
          "request_body" text,
          "display_type" varchar(32) DEFAULT 'singleValue' NOT NULL,
          "display_config" text NOT NULL,
          "enabled" boolean DEFAULT true NOT NULL,
          "created_at" timestamp NOT NULL,
          "updated_at" timestamp NOT NULL,
          "creator_id" varchar(64),
          CONSTRAINT "custom_widget_definition_creator_id_user_id_fk"
            FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE SET NULL
        );
        CREATE TABLE "custom_widget_secret" (
          "kind" varchar(64) NOT NULL,
          "value" text NOT NULL,
          "updated_at" timestamp NOT NULL,
          "definition_id" varchar(64) NOT NULL,
          CONSTRAINT "custom_widget_secret_definition_id_kind_pk" PRIMARY KEY("definition_id", "kind"),
          CONSTRAINT "custom_widget_secret_definition_id_custom_widget_definition_id_fk"
            FOREIGN KEY ("definition_id") REFERENCES "custom_widget_definition"("id") ON DELETE CASCADE
        );
        INSERT INTO "user" ("id") VALUES ('owner');
        INSERT INTO "custom_widget_definition" (
          "id", "name", "url", "auth_type", "method", "display_type", "display_config", "enabled",
          "created_at", "updated_at", "creator_id"
        ) VALUES (
          'legacy-weather', 'Weather', 'https://example.test/weather', 'bearer', 'GET', 'singleValue',
          '{"type":"singleValue","jsonPath":"$.temperature"}', true,
          '2023-11-14 00:00:00', '2023-11-14 00:00:01', 'owner'
        );
        INSERT INTO "custom_widget_secret" ("kind", "value", "updated_at", "definition_id")
        VALUES ('apiKey', 'encrypted.value', '2023-11-14 00:00:01', 'legacy-weather');
      `);

      const migration = readFileSync(
        path.join(__dirname, "..", "migrations", "postgresql", "0010_custom_widget_v2_reset.sql"),
        "utf8",
      );
      for (const statement of migration
        .split("--> statement-breakpoint")
        .map((value) => value.trim())
        .filter(Boolean)) {
        await pool.query(statement);
      }

      expect(
        (await pool.query("SELECT id, name, enabled, creator_id FROM legacy_custom_widget_definition")).rows,
      ).toEqual([
        expect.objectContaining({ id: "legacy-weather", name: "Weather", enabled: true, creator_id: "owner" }),
      ]);
      expect((await pool.query("SELECT definition_id, kind, value FROM legacy_custom_widget_secret")).rows).toEqual([
        expect.objectContaining({ definition_id: "legacy-weather", kind: "apiKey", value: "encrypted.value" }),
      ]);
    } finally {
      await pool.end();
      await postgreSqlContainer.stop();
    }
  }, 40_000);
});
