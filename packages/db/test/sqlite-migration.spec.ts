import path from "path";
import { readFileSync } from "node:fs";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import SuperJSON from "superjson";
import { expect, test } from "vitest";

import { DB_CASING } from "@homarr/core/infrastructure/db/constants";
import { widgetIntegrationSupport } from "@homarr/definitions";

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

test("board theme migration preserves explicit appearance overrides", () => {
  const connection = new BetterSqlite3(":memory:");
  try {
    const journal = JSON.parse(
      readFileSync(path.join(__dirname, "..", "migrations", "sqlite", "meta", "_journal.json"), "utf8"),
    ) as { entries: { tag: string }[] };
    connection.exec("BEGIN");
    for (const entry of journal.entries) {
      if (entry.tag === "0054_board_theme_inheritance") break;
      applyMigration(connection, `${entry.tag}.sql`);
    }
    connection.exec("COMMIT");
    connection.exec(`
      INSERT INTO board (id, name, primary_color, secondary_color, item_radius) VALUES
        ('chosen-defaults', 'chosen-defaults', '#fa5252', '#fd7e14', 'lg'),
        ('chosen-custom', 'chosen-custom', '#123456', '#abcdef', 'xs');
      INSERT INTO layout (id, name, board_id, column_count)
        VALUES ('existing-layout', 'Base', 'chosen-defaults', 12);
    `);

    applyMigration(connection, "0054_board_theme_inheritance.sql");

    expect(
      connection.prepare("SELECT id, primary_color, secondary_color, item_radius FROM board ORDER BY id").all(),
    ).toEqual([
      { id: "chosen-custom", primary_color: "#123456", secondary_color: "#abcdef", item_radius: "xs" },
      { id: "chosen-defaults", primary_color: "#fa5252", secondary_color: "#fd7e14", item_radius: "lg" },
    ]);
    expect(connection.prepare("SELECT id FROM layout").all()).toEqual([{ id: "existing-layout" }]);
    expect(connection.pragma("foreign_key_check")).toEqual([]);

    connection.exec("INSERT INTO board (id, name) VALUES ('new-board', 'new-board')");
    expect(
      connection.prepare("SELECT primary_color, secondary_color, item_radius FROM board WHERE id = 'new-board'").get(),
    ).toEqual({ primary_color: null, secondary_color: null, item_radius: null });
  } finally {
    connection.close();
  }
});

test("SQLite migrations seed the disabled bundled custom widgets", async () => {
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

test("SQLite migrations seed the intentional demo showcase", async () => {
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
        items: { with: { integrations: true, layouts: true } },
      },
    });
    if (!board) throw new Error("Demo board was not seeded");

    expect(board).toMatchObject({
      name: "default",
      pageTitle: "Homarr · Feature tour",
      backgroundImageUrl: null,
      primaryColor: null,
      secondaryColor: null,
      itemRadius: "lg",
    });
    expect(demoUser.mobileHomeBoardId).toBe(board.id);
    expect(JSON.parse(demoUser.headerPreferences)).toMatchObject({
      version: 4,
      visible: true,
      logoDisplay: "logoAndText",
      tabsDisplay: "wide",
    });
    expect(board.layouts).toHaveLength(3);
    expect(board.layouts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Base", columnCount: 12, breakpoint: 1200, role: "base" }),
        expect.objectContaining({ name: "Tablet", columnCount: 6, breakpoint: 600, role: "custom" }),
        expect.objectContaining({ name: "Mobile", columnCount: 3, breakpoint: 0, role: "mobile" }),
      ]),
    );
    expect(
      board.layouts.every((layout) => layout.leftGutterColumnCount === 0 && layout.rightGutterColumnCount === 0),
    ).toBe(true);
    expect(board.sections.toSorted((first, second) => first.yOffset - second.yOffset)).toEqual([
      expect.objectContaining({ kind: "empty", name: "Overview", xOffset: 0, yOffset: 0 }),
      expect.objectContaining({ kind: "empty", name: "Explore", xOffset: 0, yOffset: 1 }),
    ]);
    expect(board.items).toHaveLength(68);
    expect(new Set(board.items.map(({ kind }) => kind))).toEqual(
      new Set([
        "anchorNote",
        "app",
        "archiveTeamWarrior",
        "assistant",
        "audioStats",
        "bazarr",
        "beszelAlerts",
        "beszelSystemGrid",
        "beszelSystemStats",
        "beszelSystemTable",
        "bookmarks",
        "calendar",
        "clock",
        "coolify",
        "countdown",
        "customApi",
        "dnsHoleControls",
        "dnsHoleSummary",
        "dockerContainers",
        "downloads",
        "firewall",
        "healthMonitoring",
        "immich-albumCarousel",
        "immich-serverStats",
        "indexerManager",
        "mediaMissing",
        "mediaReleases",
        "mediaRequests-requestList",
        "mediaRequests-requestStats",
        "mediaServer",
        "mediaTranscoding",
        "networkControllerStatus",
        "networkControllerSummary",
        "notebook",
        "notifications",
        "paperlessNgx",
        "patchmon",
        "smartHome-controls",
        "speedtestTracker",
        "stats",
        "timer",
        "tracearr",
        "traefik",
        "umami",
        "ups",
        "uptimeKuma",
        "vpn",
        "wud",
      ]),
    );
    const sectionIds = new Set(board.sections.map(({ id }) => id));
    for (const item of board.items) {
      expect(new Set(item.layouts.map(({ layoutId }) => layoutId))).toEqual(new Set(board.layouts.map(({ id }) => id)));
      expect(new Set(item.layouts.map(({ sectionId }) => sectionId)).size).toBe(1);
      for (const placement of item.layouts) {
        const layout = board.layouts.find(({ id }) => id === placement.layoutId);
        if (!layout) throw new Error("Demo item has an unknown layout");
        expect(sectionIds.has(placement.sectionId)).toBe(true);
        expect(placement.xOffset).toBeGreaterThanOrEqual(0);
        expect(placement.yOffset).toBeGreaterThanOrEqual(0);
        expect(placement.width).toBeGreaterThan(0);
        expect(placement.height).toBeGreaterThan(0);
        expect(placement.xOffset + placement.width).toBeLessThanOrEqual(layout.columnCount);
      }
    }
    const itemByKind = (kind: string) => board.items.find((item) => item.kind === kind);
    expect(board.items.filter((item) => item.kind === "stats")).toHaveLength(1);

    const branding = await database.query.serverSettings.findFirst({
      where: (table, { eq }) => eq(table.settingKey, "branding"),
    });
    if (!branding) throw new Error("Demo branding was not seeded");
    expect(SuperJSON.parse(branding.value)).toMatchObject({
      themeId: "custom",
      customTheme: {
        theme: {
          fontFamily: "var(--font-geist), system-ui, sans-serif",
          fontFamilyMonospace: "var(--font-geist-mono), ui-monospace, monospace",
          primaryShade: { light: 7, dark: 4 },
        },
        light: { body: "#f1f4f5", primary: "#397a73" },
        dark: { body: "#14191f", primary: "#6ba7a0" },
      },
    });

    const mockIntegration = await database.query.integrations.findFirst({
      where: (table, { eq }) => eq(table.kind, "mock"),
    });
    if (!mockIntegration) throw new Error("Demo mock integration was not seeded");
    for (const item of board.items) {
      if (item.kind === "stats") continue;
      if (widgetIntegrationSupport[item.kind] === undefined) continue;
      expect(item.integrations).toEqual([
        expect.objectContaining({ integrationId: mockIntegration.id, itemId: item.id }),
      ]);
    }

    const statsItem = itemByKind("stats");
    if (!statsItem?.options) throw new Error("Demo statistics widget was not seeded");
    const statsOptions = SuperJSON.parse<{
      table: boolean;
      entries: { integrationId: string; metric: string }[];
    }>(statsItem.options);
    expect(statsOptions.table).toBe(false);
    expect(statsOptions.entries).toHaveLength(32);
    const statsIntegrationIds = new Set(statsItem.integrations.map(({ integrationId }) => integrationId));
    expect(statsIntegrationIds).toEqual(new Set(statsOptions.entries.map(({ integrationId }) => integrationId)));
    const statsIntegrations = (await database.query.integrations.findMany()).filter(({ id }) =>
      statsIntegrationIds.has(id),
    );
    expect(new Set(statsIntegrations.map(({ kind }) => kind))).toEqual(
      new Set(["sonarr", "radarr", "qBittorrent", "proxmox", "piHole", "immich", "karakeep", "mealie", "spoolman"]),
    );

    const appItems = board.items.filter((item) => item.kind === "app");
    const apps = await database.query.apps.findMany();
    expect(appItems).toHaveLength(12);
    const appIds = new Set(appItems.map((item) => SuperJSON.parse<{ appId: string }>(item.options).appId));
    expect(appIds.size).toBe(12);
    expect(new Set(apps.filter(({ id }) => appIds.has(id)).map(({ name }) => name))).toEqual(
      new Set([
        "Sonarr",
        "Radarr",
        "Plex",
        "Jellyfin",
        "Proxmox",
        "Pi-hole",
        "Grafana",
        "Portainer",
        "Uptime Kuma",
        "Nextcloud",
        "qBittorrent",
        "Overseerr",
      ]),
    );

    const customDefinition = await database.query.customWidgetDefinitions.findFirst({
      where: (table, { eq }) => eq(table.creatorId, demoUser.id),
    });
    if (!customDefinition) throw new Error("Demo local Custom JSX definition was not seeded");
    expect(customDefinition).toMatchObject({ name: "Maintenance checks", enabled: true });
    expect(SuperJSON.parse(customDefinition.requests)).toEqual({});
    expect(customDefinition.template).toContain("options.title");
    const customItem = itemByKind("customApi");
    if (!customItem) throw new Error("Demo Custom JSX item was not seeded");
    expect(SuperJSON.parse<{ definitionId: string }>(customItem.options).definitionId).toBe(customDefinition.id);

    const countsBeforeReseed = {
      boards: await database.query.boards.findMany(),
      apps,
      integrations: await database.query.integrations.findMany(),
      definitions: await database.query.customWidgetDefinitions.findMany(),
      items: await database.query.items.findMany(),
    };
    connection.prepare("UPDATE board SET page_title = ? WHERE id = ?").run("Existing demo title", board.id);
    await seedDataAsync(database as unknown as Database);
    expect(await database.query.boards.findMany()).toEqual(
      countsBeforeReseed.boards.map((existingBoard) => {
        if (existingBoard.id === board.id) return { ...existingBoard, pageTitle: "Existing demo title" };
        return existingBoard;
      }),
    );
    expect(await database.query.apps.findMany()).toEqual(countsBeforeReseed.apps);
    expect(await database.query.integrations.findMany()).toEqual(countsBeforeReseed.integrations);
    expect(await database.query.customWidgetDefinitions.findMany()).toEqual(countsBeforeReseed.definitions);
    expect(await database.query.items.findMany()).toEqual(countsBeforeReseed.items);
    expect(await database.query.users.findFirst({ where: (table, { eq }) => eq(table.id, demoUser.id) })).toEqual(
      demoUser,
    );
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
