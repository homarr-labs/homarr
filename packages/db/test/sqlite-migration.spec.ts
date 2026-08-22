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

test("SQLite migrations seed the redesigned demo dashboard", async () => {
  const previousDemoMode = process.env.DEMO_MODE;
  process.env.DEMO_MODE = "true";
  const connection = new BetterSqlite3(":memory:");
  const database = drizzle(connection, { schema: sqliteSchema, casing: DB_CASING });

  try {
    migrate(database, { migrationsFolder: path.join(__dirname, "..", "migrations", "sqlite") });
    await seedDataAsync(database as unknown as Database);

    const demoUser = await database.query.users.findFirst({
      where: (table, { eq }) => eq(table.name, "demo"),
    });
    if (!demoUser?.homeBoardId) throw new Error("Demo user or home board was not seeded");

    const board = await database.query.boards.findFirst({
      where: (table, { eq }) => eq(table.id, demoUser.homeBoardId ?? ""),
      with: {
        layouts: true,
        sections: { with: { collapseStates: true, layouts: true } },
        items: { with: { layouts: true } },
      },
    });
    if (!board) throw new Error("Demo board was not seeded");

    expect(board).toMatchObject({
      pageTitle: "Homarr demo",
      backgroundImageUrl: "/images/demo-dashboard-background.svg",
    });
    expect(board.layouts).toHaveLength(2);
    expect(board.layouts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ columnCount: 13, rightGutterColumnCount: 1, role: "base" }),
        expect.objectContaining({ columnCount: 3, rightGutterColumnCount: 0, role: "mobile" }),
      ]),
    );
    const baseLayout = board.layouts.find((layout) => layout.role === "base");
    if (!baseLayout) throw new Error("Demo base layout was not seeded");

    const mainSection = board.sections.find((section) => section.kind === "empty" && section.xOffset === 0);
    const rightSection = board.sections.find((section) => section.kind === "empty" && section.xOffset === 1);
    const networkSection = board.sections.find((section) => section.kind === "container");
    if (!mainSection || !rightSection || !networkSection) throw new Error("Demo board sections were not seeded");

    expect(networkSection.layouts.find((layout) => layout.layoutId === baseLayout.id)).toMatchObject({
      parentSectionId: mainSection.id,
      xOffset: 3,
      yOffset: 5,
      width: 6,
      height: 6,
    });
    expect(networkSection.collapseStates).toEqual([expect.objectContaining({ userId: demoUser.id, collapsed: true })]);

    const itemByKind = (kind: string) => board.items.find((item) => item.kind === kind);
    const expectItemLayout = (kind: string, width: number, height: number) => {
      const layout = itemByKind(kind)?.layouts.find((candidate) => candidate.layoutId === baseLayout.id);
      expect(layout).toMatchObject({ width, height });
    };
    expectItemLayout("calendar", 2, 2);
    expectItemLayout("downloads", 5, 2);
    expectItemLayout("dockerContainers", 4, 3);
    expectItemLayout("mediaServer", 3, 2);
    expectItemLayout("beszelSystemGrid", 4, 3);

    const rightRailItems = board.items.filter((item) =>
      item.layouts.some((layout) => layout.layoutId === baseLayout.id && layout.sectionId === rightSection.id),
    );
    expect(rightRailItems).toHaveLength(12);
    expect(
      rightRailItems.every((item) => {
        const layout = item.layouts.find((candidate) => candidate.layoutId === baseLayout.id);
        return item.kind === "app" && layout?.width === 1 && layout.height === 1;
      }),
    ).toBe(true);

    const networkItems = board.items.filter((item) =>
      item.layouts.some((layout) => layout.layoutId === baseLayout.id && layout.sectionId === networkSection.id),
    );
    expect(networkItems.map((item) => item.kind).toSorted()).toEqual(
      ["beszelAlerts", "beszelSystemStats", "dnsHoleSummary", "healthMonitoring", "notifications"].toSorted(),
    );
    const notificationsLayout = networkItems
      .find((item) => item.kind === "notifications")
      ?.layouts.find((layout) => layout.layoutId === baseLayout.id);
    expect(notificationsLayout).toMatchObject({ width: 2, height: 2 });

    const workshopDefinition = await database.query.customWidgetDefinitions.findFirst({
      where: (table, { eq }) => eq(table.creatorId, demoUser.id),
    });
    if (!workshopDefinition) throw new Error("Demo Workshop definition was not seeded");
    expect(workshopDefinition.name).toBe("Community Workshop");
    expect(SuperJSON.parse<Record<string, { baseUrl: string }>>(workshopDefinition.sources).default?.baseUrl).toBe(
      "https://homarr.dev",
    );

    const workshopItem = itemByKind("customApi");
    if (!workshopItem) throw new Error("Demo Workshop item was not seeded");
    expect(SuperJSON.parse<{ definitionId: string }>(workshopItem.options).definitionId).toBe(workshopDefinition.id);
  } finally {
    connection.close();
    if (previousDemoMode === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = previousDemoMode;
  }
});

test("Custom Widget v2 migration preserves v1 data and board references", () => {
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

  applyMigration(connection, "0042_custom_widget_v2_tables.sql");
  connection.exec(`
    INSERT INTO custom_widget_v2_definition (
      id, name, sources, requests, options, template, enabled, created_at, updated_at, creator_id
    ) VALUES (
      'legacy-weather', 'Weather v2', '[]', '[]', '[]', '<Text>Weather</Text>', true,
      1700000002, 1700000003, 'owner'
    );
    INSERT INTO custom_widget_v2_secret (source_id, kind, encrypted_value, updated_at, definition_id)
    VALUES ('weather', 'apiKey', 'encrypted.v2-value', 1700000003, 'legacy-weather');
  `);

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
