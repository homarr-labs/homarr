import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { stringify } from "superjson";

import { db as database, eq } from "@homarr/db";
import { seedDataAsync } from "@homarr/db/migrations/seed";
import * as schema from "@homarr/db/schema";
import { getIconUrl } from "@homarr/definitions";
import { defaultServerSettings } from "@homarr/server-settings";
import { containerSectionOptionsDefaults } from "@homarr/validation/shared";

import {
  createPrototypeStatsOptions,
  prototypeFixtureIds as ids,
} from "../apps/nextjs/src/components/board/sections/__prototype__/prototype-fixtures";

migrate(database, { migrationsFolder: path.resolve("packages/db/migrations/sqlite") });
await seedDataAsync(database);

// This database belongs only to the throwaway prototype launcher.
await database.delete(schema.boards).where(eq(schema.boards.id, ids.board));
await database.insert(schema.boards).values({
  id: ids.board,
  name: "adaptive-containers-prototype",
  pageTitle: "Homarr",
  isPublic: true,
  primaryColor: "#9775fa",
  secondaryColor: "#748ffc",
  itemRadius: "md",
  disableStatus: true,
});
await database
  .insert(schema.integrations)
  .values([
    { id: ids.integration, name: "Jellyfin · prototype data", kind: "jellyfin", url: "http://127.0.0.1:1" },
    {
      id: ids.downloadsIntegration,
      name: "qBittorrent · prototype data",
      kind: "qBittorrent",
      url: "http://127.0.0.1:1",
    },
    { id: ids.requestsIntegration, name: "Jellyseerr · prototype data", kind: "jellyseerr", url: "http://127.0.0.1:1" },
  ])
  .onConflictDoNothing();

const mainId = "adaptive-prototype-main";
const linksId = "adaptive-prototype-links";
await database.insert(schema.sections).values([
  { id: mainId, boardId: ids.board, kind: "empty", xOffset: 0, yOffset: 0 },
  {
    id: ids.container,
    boardId: ids.board,
    kind: "container",
    options: stringify({ ...containerSectionOptionsDefaults, title: "SMART STACK", showLabel: true }),
  },
  {
    id: linksId,
    boardId: ids.board,
    kind: "container",
    options: stringify({ ...containerSectionOptionsDefaults, title: "Quick access", showLabel: true }),
  },
]);
await database.insert(schema.items).values([
  {
    id: ids.media,
    boardId: ids.board,
    kind: "mediaServer",
    advancedOptions: stringify({ title: "Currently playing" }),
    options: stringify({ showOnlyPlaying: true, showBitrate: true, showLocation: true }),
  },
  { id: ids.stats, boardId: ids.board, kind: "stats", options: stringify(createPrototypeStatsOptions()) },
  {
    id: ids.downloads,
    boardId: ids.board,
    kind: "downloads",
    advancedOptions: stringify({ title: "Downloads" }),
    options: stringify({ columns: ["name", "progress", "downSpeed", "time", "state"] }),
  },
  {
    id: ids.requests,
    boardId: ids.board,
    kind: "mediaRequests-requestList",
    advancedOptions: stringify({ title: "Requests" }),
    options: stringify({ linksTargetNewTab: true, statusFilter: ["pending"], recentDays: 0 }),
  },
  {
    id: "adaptive-prototype-clock",
    boardId: ids.board,
    kind: "clock",
    options: stringify({ showWeather: false, showDate: true, is24HourFormat: true }),
  },
  {
    id: ids.overviewClock,
    boardId: ids.board,
    kind: "clock",
    advancedOptions: stringify({ title: "Clock" }),
    options: stringify({ showWeather: false, showDate: true, is24HourFormat: true }),
  },
]);
await database.insert(schema.integrationItems).values([
  { itemId: ids.media, integrationId: ids.integration },
  { itemId: ids.stats, integrationId: ids.integration },
  { itemId: ids.downloads, integrationId: ids.downloadsIntegration },
  { itemId: ids.requests, integrationId: ids.requestsIntegration },
]);

const services = [
  { slug: "jellyfin", kind: "jellyfin", name: "Jellyfin", href: "https://jellyfin.org" },
  { slug: "qbittorrent", kind: "qBittorrent", name: "qBittorrent", href: "https://www.qbittorrent.org" },
  { slug: "immich", kind: "immich", name: "Immich", href: "https://immich.app" },
  { slug: "home-assistant", kind: "homeAssistant", name: "Home Assistant", href: "https://www.home-assistant.io" },
] as const;
for (const service of services) {
  const appId = `adaptive-prototype-app-${service.slug}`;
  await database
    .insert(schema.apps)
    .values({ id: appId, name: service.name, iconUrl: getIconUrl(service.kind), href: service.href })
    .onConflictDoNothing();
  for (const prefix of ["top", "links"]) {
    await database.insert(schema.items).values({
      id: `adaptive-prototype-${prefix}-${service.slug}`,
      boardId: ids.board,
      kind: "app",
      options: stringify({
        appId,
        pingEnabled: false,
        showTitle: true,
        layout: "row",
        descriptionDisplayMode: "hidden",
      }),
    });
  }
}

for (const layout of [
  { id: "adaptive-prototype-base", name: "Base", columnCount: 12, breakpoint: 768, role: "base" as const },
  { id: "adaptive-prototype-mobile", name: "Mobile", columnCount: 3, breakpoint: 0, role: "mobile" as const },
]) {
  const mobile = layout.role === "mobile";
  let mediaWidth = 9;
  let mediaTop = 1;
  let linksHeight = 2;
  let clockX = 9;
  let clockY = 1;
  let clockHeight = 2;
  if (mobile) {
    mediaWidth = 3;
    mediaTop = 2;
    linksHeight = 4;
    clockX = 0;
    clockY = mediaTop + 10;
    clockHeight = 1;
  }
  await database.insert(schema.layouts).values({ ...layout, boardId: ids.board });
  await database.insert(schema.sectionLayouts).values([
    {
      sectionId: ids.container,
      layoutId: layout.id,
      parentSectionId: mainId,
      xOffset: 0,
      yOffset: mediaTop,
      width: mediaWidth,
      height: 6,
    },
    {
      sectionId: linksId,
      layoutId: layout.id,
      parentSectionId: mainId,
      xOffset: 0,
      yOffset: mediaTop + 6,
      width: mediaWidth,
      height: linksHeight,
    },
  ]);
  await database.insert(schema.itemLayouts).values([
    {
      itemId: ids.media,
      layoutId: layout.id,
      sectionId: ids.container,
      xOffset: 0,
      yOffset: 0,
      width: mediaWidth,
      height: 3,
    },
    {
      itemId: ids.downloads,
      layoutId: layout.id,
      sectionId: ids.container,
      xOffset: 0,
      yOffset: 3,
      width: mediaWidth,
      height: 2,
    },
    {
      itemId: ids.requests,
      layoutId: layout.id,
      sectionId: ids.container,
      xOffset: 0,
      yOffset: 5,
      width: mediaWidth,
      height: 1,
    },
    {
      itemId: "adaptive-prototype-clock",
      layoutId: layout.id,
      sectionId: mainId,
      xOffset: clockX,
      yOffset: clockY,
      width: 3,
      height: clockHeight,
    },
    {
      itemId: ids.stats,
      layoutId: layout.id,
      sectionId: ids.container,
      xOffset: 0,
      yOffset: 2,
      width: mediaWidth,
      height: 1,
    },
    {
      itemId: ids.overviewClock,
      layoutId: layout.id,
      sectionId: ids.container,
      xOffset: 0,
      yOffset: 0,
      width: mediaWidth,
      height: 2,
    },
  ]);
  for (const [index, service] of services.entries()) {
    let topX = index * 3;
    let topY = 0;
    let topWidth = 3;
    let linksX = (index % 3) * 3;
    let linksY = Math.floor(index / 3);
    if (mobile) {
      topX = index % 3;
      topY = Math.floor(index / 3);
      topWidth = 1;
      linksX = 0;
      linksY = index;
    }
    await database.insert(schema.itemLayouts).values([
      {
        itemId: `adaptive-prototype-top-${service.slug}`,
        layoutId: layout.id,
        sectionId: mainId,
        xOffset: topX,
        yOffset: topY,
        width: topWidth,
        height: 1,
      },
      {
        itemId: `adaptive-prototype-links-${service.slug}`,
        layoutId: layout.id,
        sectionId: linksId,
        xOffset: linksX,
        yOffset: linksY,
        width: 3,
        height: 1,
      },
    ]);
  }
}
await database.update(schema.onboarding).set({ step: "finish", previousStep: "setup" });
await database
  .update(schema.serverSettings)
  .set({
    value: stringify({
      ...defaultServerSettings.board,
      homeBoardId: ids.board,
      mobileHomeBoardId: ids.board,
    }),
  })
  .where(eq(schema.serverSettings.settingKey, "board"));
console.log("Native smart-stack prototype board prepared in its scratch database.");
process.exit(0);
