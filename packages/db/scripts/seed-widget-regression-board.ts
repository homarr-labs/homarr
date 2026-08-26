import { relative, resolve } from "node:path";

import { stringify } from "superjson";

import { createId } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";

import { db, eq } from "..";
import { apps, boards, integrationItems, integrations, itemLayouts, items, layouts, sections, users } from "../schema";

const boardName = "widget-regressions";
const truthyEnvironmentValues = new Set(["1", "true", "yes", "on"]);

interface FixtureWidget {
  kind: WidgetKind;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
  mobileHeight: number;
  needsIntegration: boolean;
  options?: Record<string, unknown>;
}

if (process.env.DB_DRIVER !== "better-sqlite3") {
  throw new Error("The widget regression fixture only supports an isolated better-sqlite3 demo database");
}

if (!truthyEnvironmentValues.has((process.env.DEMO_MODE ?? "").toLowerCase())) {
  throw new Error("The widget regression fixture requires DEMO_MODE=true");
}

if (truthyEnvironmentValues.has((process.env.DEMO_READ_ONLY ?? "").toLowerCase())) {
  throw new Error("The widget regression fixture requires writable demo mode");
}

const databaseUrl = process.env.DB_URL;
if (!databaseUrl) {
  throw new Error("The widget regression fixture requires DB_URL");
}

const resolvedDatabasePath = resolve(databaseUrl);
const pathWithinTmp = relative("/tmp", resolvedDatabasePath);
if (pathWithinTmp.length === 0 || pathWithinTmp.startsWith("..")) {
  throw new Error("The widget regression fixture requires an isolated SQLite database under /tmp");
}

const demoUser = await db.query.users.findFirst({
  where: eq(users.name, "demo"),
});
if (!demoUser) {
  throw new Error("Demo user not found. Run the SQLite migrations and demo seed first");
}

const mockIntegration = await db.query.integrations.findFirst({
  where: eq(integrations.kind, "mock"),
});
if (!mockIntegration) {
  throw new Error("Mock integration not found. Start the seed with DEMO_MODE=true");
}

const sonarrApp = await db.query.apps.findFirst({
  where: eq(apps.name, "Sonarr"),
});
if (!sonarrApp) {
  throw new Error("Seeded Sonarr app not found");
}

const existingBoard = await db.query.boards.findFirst({
  where: eq(boards.name, boardName),
});
if (existingBoard) {
  await db.delete(boards).where(eq(boards.id, existingBoard.id));
}

const boardId = createId();
const sectionId = createId();
const mobileLayoutId = createId();
const baseLayoutId = createId();

await db.insert(boards).values({
  id: boardId,
  name: boardName,
  isPublic: false,
  creatorId: demoUser.id,
  pageTitle: "Widget regression fixture",
  primaryColor: "#fa5252",
  secondaryColor: "#fd7e14",
  itemRadius: "lg",
});
await db.insert(sections).values({
  id: sectionId,
  boardId,
  kind: "empty",
  xOffset: 0,
  yOffset: 0,
});
await db.insert(layouts).values([
  {
    id: mobileLayoutId,
    name: "Mobile",
    boardId,
    columnCount: 3,
    breakpoint: 0,
    role: "mobile",
  },
  {
    id: baseLayoutId,
    name: "Base",
    boardId,
    columnCount: 16,
    breakpoint: 768,
    role: "base",
  },
]);

const fixtureWidgets: FixtureWidget[] = [
  {
    kind: "indexerManager",
    xOffset: 0,
    yOffset: 0,
    width: 2,
    height: 4,
    mobileHeight: 4,
    needsIntegration: true,
    options: { openIndexerSiteInNewTab: true },
  },
  {
    kind: "systemResources",
    xOffset: 2,
    yOffset: 0,
    width: 4,
    height: 4,
    mobileHeight: 4,
    needsIntegration: true,
    options: {
      hasShadow: true,
      visibleCharts: ["cpu", "memory", "network"],
      labelDisplayMode: "textWithIcon",
    },
  },
  {
    kind: "networkControllerStatus",
    xOffset: 6,
    yOffset: 0,
    width: 2,
    height: 1,
    mobileHeight: 1,
    needsIntegration: true,
    options: { content: "wired" },
  },
  {
    kind: "networkControllerStatus",
    xOffset: 6,
    yOffset: 1,
    width: 1,
    height: 1,
    mobileHeight: 1,
    needsIntegration: true,
    options: { content: "wifi" },
  },
  {
    kind: "audioStats",
    xOffset: 8,
    yOffset: 0,
    width: 2,
    height: 2,
    mobileHeight: 3,
    needsIntegration: true,
    options: {
      showArtists: true,
      showAlbums: true,
      showSongs: true,
      compactMode: false,
    },
  },
  {
    kind: "paperlessNgx",
    xOffset: 10,
    yOffset: 0,
    width: 2,
    height: 2,
    mobileHeight: 3,
    needsIntegration: true,
    options: {
      showInboxRatio: false,
      showInboxRing: false,
      showDocumentsTotal: true,
      showDocumentsInbox: true,
      showCorrespondents: false,
      showTags: false,
      showDocumentTypes: true,
    },
  },
  {
    kind: "networkControllerSummary",
    xOffset: 0,
    yOffset: 4,
    width: 4,
    height: 2,
    mobileHeight: 3,
    needsIntegration: true,
  },
  {
    kind: "app",
    xOffset: 4,
    yOffset: 4,
    width: 2,
    height: 2,
    mobileHeight: 2,
    needsIntegration: false,
    options: {
      appId: sonarrApp.id,
      openInNewTab: true,
      showTitle: true,
      pingEnabled: false,
    },
  },
];

let mobileYOffset = 0;
for (const widget of fixtureWidgets) {
  const itemId = createId();
  await db.insert(items).values({
    id: itemId,
    boardId,
    kind: widget.kind,
    options: stringify(widget.options ?? {}),
  });
  await db.insert(itemLayouts).values([
    {
      itemId,
      sectionId,
      layoutId: baseLayoutId,
      xOffset: widget.xOffset,
      yOffset: widget.yOffset,
      width: widget.width,
      height: widget.height,
    },
    {
      itemId,
      sectionId,
      layoutId: mobileLayoutId,
      xOffset: 0,
      yOffset: mobileYOffset,
      width: 3,
      height: widget.mobileHeight,
    },
  ]);
  mobileYOffset += widget.mobileHeight;

  if (widget.needsIntegration) {
    await db.insert(integrationItems).values({
      itemId,
      integrationId: mockIntegration.id,
    });
  }
}

await db.update(users).set({ homeBoardId: boardId }).where(eq(users.id, demoUser.id));

const insertedItems = await db.query.items.findMany({
  where: eq(items.boardId, boardId),
});
if (insertedItems.length !== fixtureWidgets.length) {
  throw new Error(`Expected ${fixtureWidgets.length} fixture widgets, inserted ${insertedItems.length}`);
}

console.log(`Created /boards/${boardName} with ${insertedItems.length} focused regression widgets`);
