import SuperJSON from "superjson";

import { createId, objectKeys } from "@homarr/common";
import {
  createDocumentationLink,
  credentialsAdminGroup,
  defaultBookmarkApps,
  everyoneGroup,
  getIntegrationDefaultUrl,
  getIntegrationName,
  integrationDefs,
  integrationKinds,
} from "@homarr/definitions";
import type { WidgetKind } from "@homarr/definitions";
import { defaultServerSettings, defaultServerSettingsKeys } from "@homarr/server-settings";

import type { Database } from "..";
import { eq } from "..";
import { getMaxGroupPositionAsync, placeAllWidgetsAsync } from "../queries";
import {
  getServerSettingByKeyAsync,
  insertServerSettingByKeyAsync,
  updateServerSettingByKeyAsync,
} from "../queries/server-setting";

import {
  apps,
  boards,
  groupMembers,
  groupPermissions,
  groups,
  integrationItems,
  integrations,
  itemLayouts,
  items,
  layouts,
  onboarding,
  searchEngines,
  sections,
  users,
} from "../schema";
import type { Integration } from "../schema";

const isTruthyEnv = (value: string | undefined) => ["1", "yes", "t", "true"].includes((value ?? "").toLowerCase());

export const seedDataAsync = async (db: Database) => {
  if (isTruthyEnv(process.env.UNSAFE_ENABLE_MOCK_INTEGRATION)) {
    console.warn(
      "UNSAFE_ENABLE_MOCK_INTEGRATION is enabled: mock integration is available in the UI. Disable by setting UNSAFE_ENABLE_MOCK_INTEGRATION=false.",
    );
  }

  await seedEveryoneGroupAsync(db);
  await seedOnboardingAsync(db);
  await seedServerSettingsAsync(db);
  await seedDefaultSearchEnginesAsync(db);
  await seedDefaultIntegrationsAsync(db);
  await seedDefaultAppsAsync(db);
  await seedDefaultBoardAsync(db);
  await seedBoardWidgetsAsync(db);

  if (isTruthyEnv(process.env.DEMO_MODE)) {
    await seedDemoUserAsync(db);
  }
};

const seedEveryoneGroupAsync = async (db: Database) => {
  const group = await db.query.groups.findFirst({
    where: eq(groups.name, everyoneGroup),
  });

  if (group) {
    console.log("Skipping seeding of group 'everyone' as it already exists");
    return;
  }

  await db.insert(groups).values({
    id: createId(),
    name: everyoneGroup,
    position: -1,
  });
  console.log("Created group 'everyone' through seed");
};

const seedOnboardingAsync = async (db: Database) => {
  const existing = await db.query.onboarding.findFirst();

  if (existing) {
    console.log("Skipping seeding of onboarding as it already exists");
    return;
  }

  await db.insert(onboarding).values({
    id: createId(),
    step: "start",
  });
  console.log("Created onboarding step through seed");
};

const seedDefaultSearchEnginesAsync = async (db: Database) => {
  const existingSearchEngines = await db.$count(searchEngines);

  if (existingSearchEngines > 0) {
    console.log("Skipping seeding of default search engines as some already exists");
    return;
  }

  const homarrId = createId();
  const defaultSearchEngines = [
    {
      id: createId(),
      name: "Google",
      iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/google.svg",
      short: "g",
      description: "Search the web with Google",
      urlTemplate: "https://www.google.com/search?q=%s",
      type: "generic" as const,
      integrationId: null,
    },
    {
      id: createId(),
      name: "YouTube",
      iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/youtube.svg",
      short: "yt",
      description: "Search for videos on YouTube",
      urlTemplate: "https://www.youtube.com/results?search_query=%s",
      type: "generic" as const,
      integrationId: null,
    },
    {
      id: homarrId,
      name: "Homarr Docs",
      iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr.svg",
      short: "docs",
      description: "Search the Homarr documentation",
      urlTemplate: createDocumentationLink("/search", undefined, { q: "%s" }),
      type: "generic" as const,
      integrationId: null,
    },
  ];

  await db.insert(searchEngines).values(defaultSearchEngines);
  console.log(`Created ${defaultSearchEngines.length} default search engines through seeding process`);

  // Set Homarr docs as the default search engine in server settings
  const searchSettings = await getServerSettingByKeyAsync(db, "search");

  await updateServerSettingByKeyAsync(db, "search", {
    ...searchSettings,
    defaultSearchEngineId: homarrId,
  });
  console.log("Set Homarr docs as the default search engine");
};

const seedServerSettingsAsync = async (db: Database) => {
  const serverSettingsData = await db.query.serverSettings.findMany();

  for (const settingsKey of defaultServerSettingsKeys) {
    const currentDbEntry = serverSettingsData.find((setting) => setting.settingKey === settingsKey);
    if (!currentDbEntry) {
      await insertServerSettingByKeyAsync(db, settingsKey, defaultServerSettings[settingsKey]);
      console.log(`Created serverSetting through seed key=${settingsKey}`);
      continue;
    }

    const currentSettings = await getServerSettingByKeyAsync(db, settingsKey);
    const defaultSettings = defaultServerSettings[settingsKey];
    const missingKeys = objectKeys(defaultSettings).filter((key) => !(key in currentSettings));

    if (missingKeys.length === 0) {
      console.info(`Skipping seeding for serverSetting as it already exists key=${settingsKey}`);
      continue;
    }

    await updateServerSettingByKeyAsync(db, settingsKey, { ...defaultSettings, ...currentSettings });
    console.log(`Updated serverSetting through seed key=${settingsKey}`);
  }
};

const seedDefaultIntegrationsAsync = async (db: Database) => {
  const defaultIntegrations = integrationKinds.reduce<Integration[]>((acc, kind) => {
    const name = getIntegrationName(kind);
    const defaultUrl = getIntegrationDefaultUrl(kind);
    const hasNoAuthOption = integrationDefs[kind].secretKinds.some((kinds) => kinds.length === 0);

    if (defaultUrl !== undefined && hasNoAuthOption) {
      acc.push({
        id: "new",
        name: `${name} Default`,
        url: defaultUrl,
        kind,
        appId: null,
      });
    }

    return acc;
  }, []);

  if (defaultIntegrations.length === 0) {
    console.warn("No default integrations found to seed");
    return;
  }

  let createdCount = 0;
  await Promise.all(
    defaultIntegrations.map(async (integration) => {
      const existingKind = await db.$count(integrations, eq(integrations.kind, integration.kind));

      if (existingKind > 0) {
        console.log(`Skipping seeding of default ${integration.kind} integration as one already exists`);
        return;
      }

      const newIntegration = {
        ...integration,
        id: createId(),
      };

      await db.insert(integrations).values(newIntegration);
      createdCount++;
    }),
  );

  if (createdCount === 0) {
    console.log("No default integrations were created as they already exist");
    return;
  }

  console.log(`Created ${createdCount} default integrations through seeding process`);
};

const seedDefaultAppsAsync = async (db: Database) => {
  const existingApps = await db.$count(apps);
  if (existingApps > 0) {
    console.log("Skipping seeding of default apps as some already exist");
    return;
  }

  for (const app of defaultBookmarkApps) {
    await db.insert(apps).values({
      id: createId(),
      name: app.name,
      iconUrl: app.iconUrl,
      href: app.href,
    });
  }
  console.log(`Created ${defaultBookmarkApps.length} default apps through seeding process`);
};

const seedDefaultBoardAsync = async (db: Database) => {
  const existingBoard = await db.query.boards.findFirst();

  if (existingBoard) {
    console.log("Skipping seeding of default board as one already exists");
    return;
  }

  const boardId = createId();
  await db.insert(boards).values({
    id: boardId,
    name: "dashboard",
    isPublic: false,
  });
  await db.insert(sections).values({
    id: createId(),
    kind: "empty",
    xOffset: 0,
    yOffset: 0,
    boardId,
  });
  await db.insert(layouts).values({
    id: createId(),
    name: "Base",
    columnCount: 10,
    breakpoint: 0,
    boardId,
  });

  const everyoneGroupRow = await db.query.groups.findFirst({
    where: eq(groups.name, everyoneGroup),
  });
  if (everyoneGroupRow) {
    await db.update(groups).set({ homeBoardId: boardId }).where(eq(groups.id, everyoneGroupRow.id));
    console.log("Set default board as home board for everyone group");
  }

  console.log("Created default board 'dashboard' through seed");
};

interface DemoWidget {
  kind: WidgetKind;
  width: number;
  height: number;
  needsIntegration: boolean;
  options?: Record<string, unknown>;
}

const demoApps = [
  {
    name: "Sonarr",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/sonarr.svg",
    href: "https://sonarr.tv",
  },
  {
    name: "Radarr",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/radarr.svg",
    href: "https://radarr.video",
  },
  {
    name: "Plex",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/plex.svg",
    href: "https://plex.tv",
  },
  {
    name: "Jellyfin",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/jellyfin.svg",
    href: "https://jellyfin.org",
  },
  {
    name: "Proxmox",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/proxmox.svg",
    href: "https://proxmox.com",
  },
  {
    name: "Pi-hole",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/pi-hole.svg",
    href: "https://pi-hole.net",
  },
  {
    name: "Grafana",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/grafana.svg",
    href: "https://grafana.com",
  },
  {
    name: "Portainer",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/portainer.svg",
    href: "https://portainer.io",
  },
  {
    name: "Home Assistant",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/home-assistant.svg",
    href: "https://home-assistant.io",
  },
  {
    name: "Nextcloud",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/nextcloud.svg",
    href: "https://nextcloud.com",
  },
  {
    name: "qBittorrent",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/qbittorrent.svg",
    href: "https://qbittorrent.org",
  },
  {
    name: "Overseerr",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/overseerr.svg",
    href: "https://overseerr.dev",
  },
] as const;

const buildDemoWidgets = (appIds: string[]): DemoWidget[] => [
  // Row 1: calendar + downloads + clock = 12
  { kind: "calendar", width: 5, height: 3, needsIntegration: true },
  { kind: "downloads", width: 5, height: 3, needsIntegration: true },
  { kind: "clock", width: 2, height: 1, needsIntegration: false },
  // Row 2: healthMonitoring + bookmarks = 12
  { kind: "healthMonitoring", width: 6, height: 3, needsIntegration: true },
  {
    kind: "bookmarks",
    width: 6,
    height: 3,
    needsIntegration: false,
    options: { title: "Homelab", items: appIds, layout: "grid", openNewTab: true },
  },
  // Row 3: mediaServer + mediaTranscoding + dnsHoleSummary = 12
  { kind: "mediaServer", width: 3, height: 2, needsIntegration: true },
  { kind: "mediaTranscoding", width: 3, height: 2, needsIntegration: true },
  { kind: "dnsHoleSummary", width: 6, height: 2, needsIntegration: true },
  // Row 4: dnsHoleControls + mediaReleases + notifications = 12
  { kind: "dnsHoleControls", width: 2, height: 1, needsIntegration: true },
  { kind: "mediaReleases", width: 4, height: 2, needsIntegration: true },
  { kind: "notifications", width: 6, height: 2, needsIntegration: true },
  // Row 5: requestList + requestStats + indexerManager = 12
  { kind: "mediaRequests-requestList", width: 4, height: 3, needsIntegration: true },
  { kind: "mediaRequests-requestStats", width: 4, height: 2, needsIntegration: true },
  { kind: "indexerManager", width: 4, height: 2, needsIntegration: true },
  // Row 6: networkControllerSummary + networkControllerStatus + rssFeed = 12
  { kind: "networkControllerSummary", width: 3, height: 2, needsIntegration: true },
  { kind: "networkControllerStatus", width: 3, height: 2, needsIntegration: true },
  {
    kind: "rssFeed",
    width: 6,
    height: 2,
    needsIntegration: false,
    options: {
      feedUrls: ["https://selfh.st/rss/", "https://hnrss.org/newest?q=self-hosted"],
      maximumAmountPosts: 20,
      textLinesClamp: 2,
      hideDescription: false,
    },
  },
  // Row 7-8: app widgets (2x1 each, 6 per row = 12)
  ...appIds.map(
    (appId): DemoWidget => ({
      kind: "app",
      width: 2,
      height: 1,
      needsIntegration: false,
      options: { appId, openInNewTab: true, showTitle: true, pingEnabled: false },
    }),
  ),
  // Row 9: beszelSystemGrid + beszelAlerts = 12
  { kind: "beszelSystemGrid", width: 8, height: 3, needsIntegration: true },
  { kind: "beszelAlerts", width: 4, height: 3, needsIntegration: true },
  // Row 10: beszelSystemTable + beszelSystemStats = 12
  { kind: "beszelSystemTable", width: 6, height: 3, needsIntegration: true },
  { kind: "beszelSystemStats", width: 6, height: 4, needsIntegration: true },
  // Row 11: notebook + dockerContainers + weather = 12
  { kind: "notebook", width: 4, height: 4, needsIntegration: false },
  { kind: "dockerContainers", width: 6, height: 2, needsIntegration: false },
  { kind: "weather", width: 2, height: 1, needsIntegration: false },
];

const seedDemoUserAsync = async (db: Database) => {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.name, "demo"),
  });

  if (existingUser) {
    console.log("Skipping seeding of demo user as it already exists");
    return;
  }

  const userId = createId();

  await db.insert(users).values({
    id: userId,
    name: "demo",
    email: "demo@example.com",
    password: "$2b$10$odRXt5e95kSQV5Axmk/FeO6GVOxuRQQ8NnRcBA78Wg4V3kZxPY68u",
  });

  const maxPosition = await getMaxGroupPositionAsync(db);
  const groupId = createId();
  await db.insert(groups).values({
    id: groupId,
    name: credentialsAdminGroup,
    ownerId: userId,
    position: maxPosition + 1,
  });
  await db.insert(groupPermissions).values({
    groupId,
    permission: "admin",
  });
  await db.insert(groupMembers).values({
    groupId,
    userId,
  });

  await db.update(onboarding).set({
    step: "finish",
    previousStep: "settings",
  });

  const integrationId = createId();
  await db.insert(integrations).values({
    id: integrationId,
    name: "Demo Integration",
    url: "https://demo.homarr.dev",
    kind: "mock",
    appId: null,
  });

  const appIds: string[] = [];
  for (const app of demoApps) {
    const appId = createId();
    appIds.push(appId);
    await db.insert(apps).values({
      id: appId,
      name: app.name,
      iconUrl: app.iconUrl,
      href: app.href,
    });
  }

  const boardId = createId();
  await db.insert(boards).values({
    id: boardId,
    name: "default",
    isPublic: false,
    creatorId: userId,
  });

  const sectionId = createId();
  await db.insert(sections).values({
    id: sectionId,
    kind: "empty",
    xOffset: 0,
    yOffset: 0,
    boardId,
  });

  const layoutId = createId();
  await db.insert(layouts).values({
    id: layoutId,
    name: "Base",
    columnCount: 12,
    breakpoint: 0,
    boardId,
  });

  const demoWidgets = buildDemoWidgets(appIds);
  let xOffset = 0;
  let yOffset = 0;
  let rowMaxHeight = 0;
  for (const widget of demoWidgets) {
    if (xOffset + widget.width > 12) {
      xOffset = 0;
      yOffset += rowMaxHeight;
      rowMaxHeight = 0;
    }
    rowMaxHeight = Math.max(rowMaxHeight, widget.height);
    const itemId = createId();
    await db.insert(items).values({
      id: itemId,
      boardId,
      kind: widget.kind,
      ...(widget.options ? { options: SuperJSON.stringify(widget.options) } : {}),
    });
    await db.insert(itemLayouts).values({
      itemId,
      sectionId,
      layoutId,
      xOffset,
      yOffset,
      width: widget.width,
      height: widget.height,
    });
    if (widget.needsIntegration) {
      await db.insert(integrationItems).values({
        itemId,
        integrationId,
      });
    }
    xOffset += widget.width;
  }

  await db.update(users).set({ homeBoardId: boardId }).where(eq(users.id, userId));

  console.log(
    "Demo mode enabled: created demo user, mock integration, and sample board with widgets. Disable by setting DEMO_MODE=false.",
  );
};

const seedBoardWidgetsAsync = async (db: Database) => {
  const existingItems = await db.$count(items);
  if (existingItems > 0) {
    console.log("Skipping seeding of board widgets as some already exist");
    return;
  }

  const board = await db.query.boards.findFirst({
    with: { sections: true, layouts: true },
  });
  if (!board) return;

  const section = board.sections.find((sec) => sec.kind === "empty");
  const layout = board.layouts[0];
  if (!section || !layout) return;

  const allIntegrations = await db.query.integrations.findMany();
  const allApps = await db.query.apps.findMany();

  const count = await placeAllWidgetsAsync(
    db,
    { boardId: board.id, sectionId: section.id, layoutId: layout.id, columnCount: layout.columnCount },
    allIntegrations,
    allApps,
  );

  console.log(`Placed ${count} widgets on board`);
};
