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
    if (!mainSection || !rightSection) throw new Error("Demo board sections were not seeded");
    expect(board.sections.some((section) => section.kind === "container")).toBe(false);

    const itemByKind = (kind: string) => board.items.find((item) => item.kind === kind);
    const expectItemLayout = (
      kind: string,
      xOffset: number,
      yOffset: number,
      width: number,
      height: number,
      sectionId = mainSection.id,
    ) => {
      const layout = itemByKind(kind)?.layouts.find((candidate) => candidate.layoutId === baseLayout.id);
      expect(layout).toMatchObject({ sectionId, xOffset, yOffset, width, height });
    };
    expectItemLayout("calendar", 0, 0, 2, 2);
    expectItemLayout("weather", 2, 0, 2, 2);
    expectItemLayout("clock", 4, 0, 1, 2);
    expectItemLayout("timer", 5, 0, 2, 1);
    expectItemLayout("airQuality", 5, 1, 2, 1);
    expectItemLayout("downloads", 7, 0, 5, 2);
    expectItemLayout("notebook", 0, 2, 5, 3);
    expectItemLayout("beszelSystemGrid", 5, 2, 4, 3);
    expectItemLayout("assistant", 9, 2, 3, 3);
    expectItemLayout("mediaRequests-requestList", 0, 5, 3, 2);
    expectItemLayout("mediaMissing", 9, 5, 3, 2);
    expectItemLayout("mediaServer", 0, 7, 3, 2);
    expectItemLayout("mediaRequests-requestStats", 9, 7, 3, 2);
    expectItemLayout("rssFeed", 0, 9, 3, 2);
    expectItemLayout("indexerManager", 9, 9, 3, 2);
    expectItemLayout("dockerContainers", 0, 11, 4, 3);
    expectItemLayout("mediaReleases", 4, 11, 4, 3);
    expectItemLayout("customApi", 8, 11, 4, 3);

    expectItemLayout("healthMonitoring", 3, 5, 6, 2);
    expectItemLayout("dnsHoleSummary", 3, 7, 3, 2);
    expectItemLayout("beszelSystemStats", 6, 7, 3, 2);
    expectItemLayout("notifications", 3, 9, 2, 2);
    expectItemLayout("beszelAlerts", 5, 9, 4, 2);

    for (const kind of ["weather", "airQuality"]) {
      const item = itemByKind(kind);
      if (!item?.options) throw new Error(`Demo ${kind} options were not seeded`);
      expect(SuperJSON.parse<{ location: { name: string } }>(item.options).location.name).toBe("Paris");
    }

    const expectFilledGrid = (
      placements: { xOffset: number; yOffset: number; width: number; height: number }[],
      columnCount: number,
    ) => {
      const rowCount = Math.max(...placements.map((placement) => placement.yOffset + placement.height));
      const cells = Array.from({ length: rowCount }, () => Array<number>(columnCount).fill(0));
      for (const placement of placements) {
        for (let y = placement.yOffset; y < placement.yOffset + placement.height; y += 1) {
          for (let x = placement.xOffset; x < placement.xOffset + placement.width; x += 1) {
            const row = cells[y];
            if (!row) throw new Error("Demo placement exceeds the grid height");
            row[x] = (row[x] ?? 0) + 1;
          }
        }
      }
      expect(cells.every((row) => row.length === columnCount && row.every((cell) => cell === 1))).toBe(true);
    };

    const mainItemLayouts = board.items.flatMap((item) =>
      item.layouts.filter((layout) => layout.layoutId === baseLayout.id && layout.sectionId === mainSection.id),
    );
    expectFilledGrid(mainItemLayouts, 12);

    const rightRailItems = board.items.filter((item) =>
      item.layouts.some((layout) => layout.layoutId === baseLayout.id && layout.sectionId === rightSection.id),
    );
    expect(rightRailItems).toHaveLength(12);
    const rightRailLayouts = rightRailItems.flatMap((item) =>
      item.layouts.filter((layout) => layout.layoutId === baseLayout.id && layout.sectionId === rightSection.id),
    );
    expect(
      rightRailItems.every((item) => {
        const layout = item.layouts.find((candidate) => candidate.layoutId === baseLayout.id);
        return item.kind === "app" && layout?.width === 1 && layout.height === 1;
      }),
    ).toBe(true);
    expect(
      rightRailLayouts
        .toSorted((first, second) => first.yOffset - second.yOffset)
        .map(({ sectionId, xOffset, yOffset, width, height }) => ({
          sectionId,
          xOffset,
          yOffset,
          width,
          height,
        })),
    ).toEqual(
      Array.from({ length: 12 }, (_, yOffset) => ({
        sectionId: rightSection.id,
        xOffset: 0,
        yOffset,
        width: 1,
        height: 1,
      })),
    );
    expectFilledGrid(rightRailLayouts, 1);

    const workshopDefinition = await database.query.customWidgetDefinitions.findFirst({
      where: (table, { eq }) => eq(table.creatorId, demoUser.id),
    });
    if (!workshopDefinition) throw new Error("Demo Workshop definition was not seeded");
    expect(workshopDefinition.name).toBe("Community Workshop");
    expect(SuperJSON.parse<Record<string, { baseUrl: string }>>(workshopDefinition.sources).default?.baseUrl).toBe(
      "https://v2.preview.homarr.dev",
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
