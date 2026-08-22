import SuperJSON from "superjson";

import { createId, generateResponsiveGridFor, objectKeys } from "@homarr/common";
import { BUNDLED_CUSTOM_WIDGETS, customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";
import {
  createDocumentationLink,
  credentialsAdminGroup,
  defaultBookmarkApps,
  everyoneGroup,
  getIntegrationDefaultUrl,
  getIntegrationName,
  integrationDefs,
  integrationKinds,
  normalizeBoardLayoutRoles,
} from "@homarr/definitions";
import type { WidgetKind } from "@homarr/definitions";
import { defaultServerSettings, defaultServerSettingsKeys } from "@homarr/server-settings";

import type { Database, InferInsertModel } from "..";
import { eq, inArray } from "..";
import { getMaxGroupPositionAsync, placeAllWidgetsAsync } from "../queries";
import {
  getServerSettingByKeyAsync,
  insertServerSettingByKeyAsync,
  updateServerSettingByKeyAsync,
} from "../queries/server-setting";

import {
  apps,
  boards,
  customWidgetDefinitions,
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
  sectionLayouts,
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
  await seedDefaultCustomWidgetsAsync(db);
  await seedBoardWidgetsAsync(db);

  if (isTruthyEnv(process.env.DEMO_MODE)) {
    await seedDemoUserAsync(db);
  }

  await seedProtectedBoardLayoutsAsync(db);
};

export const seedProtectedBoardLayoutsAsync = async (db: Database, boardId?: string) => {
  const dbBoards = await db.query.boards.findMany({
    where: boardId ? eq(boards.id, boardId) : undefined,
    with: {
      layouts: true,
      items: { with: { layouts: true } },
      sections: { with: { layouts: true } },
    },
  });

  for (const board of dbBoards) {
    if (board.layouts.length === 0) {
      await db.insert(layouts).values([
        {
          id: createId(),
          name: "Mobile",
          columnCount: 3,
          breakpoint: 0,
          role: "mobile",
          boardId: board.id,
        },
        {
          id: createId(),
          name: "Base",
          columnCount: 10,
          breakpoint: 768,
          role: "base",
          boardId: board.id,
        },
      ]);
      continue;
    }

    if (board.layouts.length === 1) {
      const [baseLayout] = board.layouts;
      if (!baseLayout) continue;

      const mobileLayout = {
        id: createId(),
        name: "Mobile",
        columnCount: 3,
        breakpoint: 0,
        role: "mobile" as const,
        boardId: board.id,
      };

      await db.update(layouts).set({ role: "base", breakpoint: 768 }).where(eq(layouts.id, baseLayout.id));
      await db.insert(layouts).values(mobileLayout);
      await insertMissingProjectedPositionsAsync(
        db,
        board,
        { ...baseLayout, role: "base", breakpoint: 768 },
        mobileLayout,
      );
      continue;
    }

    const normalizedLayouts = normalizeBoardLayoutRoles(board.layouts);
    const alreadyNormalized = normalizedLayouts.every((layout) => {
      const previousLayout = board.layouts.find((candidate) => candidate.id === layout.id);
      return layout.breakpoint === previousLayout?.breakpoint && previousLayout.role === layout.role;
    });

    if (!alreadyNormalized) {
      for (const layout of normalizedLayouts) {
        await db
          .update(layouts)
          .set({ breakpoint: layout.breakpoint, role: layout.role })
          .where(eq(layouts.id, layout.id));
      }
    }

    const mobileLayout = normalizedLayouts[0];
    const baseLayout = normalizedLayouts.at(-1);
    if (mobileLayout && baseLayout) {
      await insertMissingProjectedPositionsAsync(
        db,
        board,
        { ...baseLayout, role: "base" },
        { ...mobileLayout, role: "mobile" },
      );
    }
  }
};

interface BoardWithLayoutPositions {
  items: Array<{
    id: string;
    layouts: Array<{
      layoutId: string;
      sectionId: string;
      width: number;
      height: number;
      xOffset: number;
      yOffset: number;
    }>;
  }>;
  sections: Array<{
    id: string;
    kind: string;
    layouts: Array<{
      layoutId: string;
      parentSectionId: string | null;
      width: number;
      height: number;
      xOffset: number;
      yOffset: number;
    }>;
  }>;
}

const insertMissingProjectedPositionsAsync = async (
  db: Database,
  board: BoardWithLayoutPositions,
  sourceLayout: InferInsertModel<typeof layouts>,
  targetLayout: InferInsertModel<typeof layouts>,
) => {
  const elements = [
    ...board.items.flatMap((item) => {
      const layout = item.layouts.find((itemLayout) => itemLayout.layoutId === sourceLayout.id);
      return layout
        ? [
            {
              id: item.id,
              type: "item" as const,
              width: layout.width,
              height: layout.height,
              xOffset: layout.xOffset,
              yOffset: layout.yOffset,
              sectionId: layout.sectionId,
            },
          ]
        : [];
    }),
    ...board.sections.flatMap((section) => {
      if (section.kind !== "dynamic") return [];
      const layout = section.layouts.find((sectionLayout) => sectionLayout.layoutId === sourceLayout.id);
      return layout?.parentSectionId
        ? [
            {
              id: section.id,
              type: "section" as const,
              width: layout.width,
              height: layout.height,
              xOffset: layout.xOffset,
              yOffset: layout.yOffset,
              sectionId: layout.parentSectionId,
            },
          ]
        : [];
    }),
  ];

  const projectedElements = board.sections
    .filter((section) => section.kind !== "dynamic")
    .flatMap(
      (section) =>
        generateResponsiveGridFor({
          items: elements,
          previousWidth: sourceLayout.columnCount,
          width: targetLayout.columnCount,
          sectionId: section.id,
        }).items,
    );

  const existingItemIds = new Set(
    board.items
      .filter((item) => item.layouts.some((layout) => layout.layoutId === targetLayout.id))
      .map((item) => item.id),
  );
  const itemPositions = projectedElements
    .filter((element) => element.type === "item" && !existingItemIds.has(element.id))
    .map(
      (element): InferInsertModel<typeof itemLayouts> => ({
        itemId: element.id,
        layoutId: targetLayout.id,
        sectionId: element.sectionId,
        width: element.width,
        height: element.height,
        xOffset: element.xOffset,
        yOffset: element.yOffset,
      }),
    );

  const existingSectionIds = new Set(
    board.sections
      .filter((section) => section.layouts.some((layout) => layout.layoutId === targetLayout.id))
      .map((section) => section.id),
  );
  const sectionPositions = projectedElements
    .filter((element) => element.type === "section" && !existingSectionIds.has(element.id))
    .map(
      (element): InferInsertModel<typeof sectionLayouts> => ({
        sectionId: element.id,
        layoutId: targetLayout.id,
        parentSectionId: element.sectionId,
        width: element.width,
        height: element.height,
        xOffset: element.xOffset,
        yOffset: element.yOffset,
      }),
    );

  if (itemPositions.length > 0) await db.insert(itemLayouts).values(itemPositions);
  if (sectionPositions.length > 0) await db.insert(sectionLayouts).values(sectionPositions);
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
  await db.insert(layouts).values([
    {
      id: createId(),
      name: "Mobile",
      columnCount: 3,
      breakpoint: 0,
      role: "mobile",
      boardId,
    },
    {
      id: createId(),
      name: "Base",
      columnCount: 10,
      breakpoint: 768,
      role: "base",
      boardId,
    },
  ]);

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
  section?: "right";
  xOffset: number;
  yOffset: number;
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
    name: "Uptime Kuma",
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/uptime-kuma.svg",
    href: "https://uptime.kuma.pet",
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

const buildDemoWidgets = (appIds: string[], customWidgetDefinitionId: string): DemoWidget[] => [
  // Daily focus
  { kind: "calendar", xOffset: 0, yOffset: 0, width: 2, height: 2, needsIntegration: true },
  {
    kind: "weather",
    xOffset: 2,
    yOffset: 0,
    width: 2,
    height: 2,
    needsIntegration: false,
    options: {
      location: { name: "Paris", latitude: 48.85341, longitude: 2.3488 },
      hasForecast: false,
      showHumidity: false,
      showCurrentWindSpeed: false,
      showCity: true,
      animateIcons: false,
    },
  },
  {
    kind: "clock",
    xOffset: 4,
    yOffset: 0,
    width: 1,
    height: 2,
    needsIntegration: false,
    options: { customTitleToggle: false, showDate: false, customTimeFormat: "HH:mm" },
  },
  {
    kind: "timer",
    xOffset: 5,
    yOffset: 0,
    width: 2,
    height: 1,
    needsIntegration: false,
    options: {
      mode: "pomodoro",
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      sessionsBeforeLongBreak: 4,
      autoStartBreaks: false,
      autoStartFocus: false,
    },
  },
  {
    kind: "airQuality",
    xOffset: 5,
    yOffset: 1,
    width: 2,
    height: 1,
    needsIntegration: false,
    options: {
      location: { name: "Paris", latitude: 48.85341, longitude: 2.3488 },
      aqiStandard: "european",
      showUv: false,
      showPollutants: false,
      showPollen: false,
    },
  },
  { kind: "downloads", xOffset: 7, yOffset: 0, width: 5, height: 2, needsIntegration: true },

  // Homarr workspace
  {
    kind: "notebook",
    xOffset: 0,
    yOffset: 2,
    width: 5,
    height: 3,
    needsIntegration: false,
    options: {
      showToolbar: false,
      allowReadOnlyCheck: true,
      content: `<p style="text-align: center"><img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr-wordmark-light.svg" width="28%"></p><h2 style="text-align: center">Quick runbook</h2><p style="text-align: center">Keep today close: signals first, controls beside them, distractions out.</p><ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Backups verified</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Review active alerts</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Connect your everyday services</p></div></li><li data-checked="false" data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Tune this board to your routine</p></div></li></ul><p style="text-align: center"><em>Make it yours. Keep it useful.</em></p>`,
    },
  },
  { kind: "beszelSystemGrid", xOffset: 5, yOffset: 2, width: 4, height: 3, needsIntegration: true },
  { kind: "assistant", xOffset: 9, yOffset: 2, width: 3, height: 3, needsIntegration: false },

  // Operations center
  { kind: "mediaRequests-requestList", xOffset: 0, yOffset: 5, width: 3, height: 2, needsIntegration: true },
  { kind: "mediaMissing", xOffset: 9, yOffset: 5, width: 3, height: 2, needsIntegration: true },
  { kind: "mediaServer", xOffset: 0, yOffset: 7, width: 3, height: 2, needsIntegration: true },
  { kind: "mediaRequests-requestStats", xOffset: 9, yOffset: 7, width: 3, height: 2, needsIntegration: true },
  {
    kind: "rssFeed",
    xOffset: 0,
    yOffset: 9,
    width: 3,
    height: 2,
    needsIntegration: false,
    options: {
      feedUrls: ["https://selfh.st/rss/", "https://hnrss.org/newest?q=self-hosted"],
      maximumAmountPosts: 12,
      textLinesClamp: 2,
      hideDescription: true,
    },
  },
  { kind: "indexerManager", xOffset: 9, yOffset: 9, width: 3, height: 2, needsIntegration: true },

  // Infrastructure and activity
  { kind: "dockerContainers", xOffset: 0, yOffset: 11, width: 4, height: 3, needsIntegration: false },
  { kind: "mediaReleases", xOffset: 4, yOffset: 11, width: 4, height: 3, needsIntegration: true },

  // Community Workshop
  {
    kind: "customApi",
    xOffset: 8,
    yOffset: 11,
    width: 4,
    height: 3,
    needsIntegration: false,
    options: { definitionId: customWidgetDefinitionId, refreshInterval: 300 },
  },

  // Network and health
  {
    kind: "healthMonitoring",
    xOffset: 3,
    yOffset: 5,
    width: 6,
    height: 2,
    needsIntegration: true,
  },
  {
    kind: "dnsHoleSummary",
    xOffset: 3,
    yOffset: 7,
    width: 3,
    height: 2,
    needsIntegration: true,
    options: { layout: "grid", usePiHoleColors: false },
  },
  {
    kind: "beszelSystemStats",
    xOffset: 6,
    yOffset: 7,
    width: 3,
    height: 2,
    needsIntegration: true,
  },
  { kind: "notifications", xOffset: 3, yOffset: 9, width: 2, height: 2, needsIntegration: true },
  { kind: "beszelAlerts", xOffset: 5, yOffset: 9, width: 4, height: 2, needsIntegration: true },

  // Right app rail
  ...appIds.map(
    (appId, index): DemoWidget => ({
      kind: "app",
      section: "right",
      xOffset: 0,
      yOffset: index,
      width: 1,
      height: 1,
      needsIntegration: false,
      options: { appId, openInNewTab: true, showTitle: true, pingEnabled: false },
    }),
  ),
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
    previousStep: "setup",
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

  const customWidgetDefinitionId = createId();
  const customWidgetDefinition = customWidgetDefinitionSchema.parse({
    $schema: "homarr-custom-widget-v2",
    name: "Community Workshop",
    description: "Live Custom Widget and Custom CSS submissions shared by the Homarr community.",
    sources: {
      default: {
        name: "Homarr Workshop",
        baseUrl: "https://v2.preview.homarr.dev",
        networkScope: "public",
        auth: "none",
      },
    },
    requests: {
      workshop: {
        path: "/api/collections/workshop_listings/records",
        query: { perPage: 50 },
        cacheSeconds: 300,
      },
    },
    options: {},
    template: `<Stack p="md" gap="xs" h="100%">
  <Group justify="space-between" wrap="nowrap">
    <Stack gap={0}><Text size="xs" c="indigo" fw={700}>COMMUNITY WORKSHOP</Text><Title order={3}>Made by Homarr users</Title></Stack>
    <Badge color="indigo" variant="light">{data.workshop?.totalItems ?? "—"} shared</Badge>
  </Group>
  <Text size="xs" c="dimmed">Build Custom Widgets or dashboard CSS, then share it with the community.</Text>
  {status.workshop?.loading ? <Stack gap="xs"><Skeleton height={26} radius="sm" /><Skeleton height={26} radius="sm" /><Skeleton height={26} radius="sm" /></Stack> : status.workshop?.error ? <Stack gap="xs"><Alert color="red" title="The Workshop could not be loaded">{status.workshop.error}</Alert><RefreshButton /></Stack> : (data.workshop?.items ?? []).length === 0 ? <Stack gap="xs"><Alert color="gray" title="Nothing shared yet">The first community submission could be yours.</Alert><RefreshButton /></Stack> : <Stack gap={4} style={{ flex: 1 }}>{(data.workshop?.items ?? []).slice(0, 4).map(submission => <Group key={submission.id} justify="space-between" wrap="nowrap"><Text size="sm" fw={600} lineClamp={1}>{submission.title}</Text><Group gap="xs" wrap="nowrap"><Text size="xs" c="dimmed">@{submission.authorName ?? "community"}</Text><Badge size="xs" color="gray" variant="light">{submission.upvotes ?? 0} ↑</Badge></Group></Group>)}{data.workshop?.totalItems > 4 ? <Text size="xs" c="dimmed">and {data.workshop.totalItems - 4} more in the Workshop</Text> : null}</Stack>}
  <Anchor href="https://homarr.dev/docs/getting-started" target="_blank" rel="noreferrer" bg="indigo" c="white" fw={700} px="md" py="xs" radius="md" underline="never">Install Homarr now →</Anchor>
</Stack>`,
  });
  await db.insert(customWidgetDefinitions).values({
    id: customWidgetDefinitionId,
    name: customWidgetDefinition.name,
    description: customWidgetDefinition.description ?? null,
    iconUrl: null,
    sources: SuperJSON.stringify(customWidgetDefinition.sources),
    requests: SuperJSON.stringify(customWidgetDefinition.requests),
    options: SuperJSON.stringify(customWidgetDefinition.options),
    template: customWidgetDefinition.template,
    enabled: true,
    creatorId: userId,
  });

  const boardId = createId();
  await db.insert(boards).values({
    id: boardId,
    name: "default",
    isPublic: false,
    creatorId: userId,
    pageTitle: "Homarr demo",
    backgroundImageUrl: "/images/demo-dashboard-background.svg",
    primaryColor: "#748FFC",
    secondaryColor: "#3BC9DB",
    opacity: 90,
    itemRadius: "xl",
  });

  const mainSectionId = createId();
  await db.insert(sections).values({
    id: mainSectionId,
    kind: "empty",
    xOffset: 0,
    yOffset: 0,
    boardId,
  });

  const rightSectionId = createId();
  await db.insert(sections).values({
    id: rightSectionId,
    kind: "empty",
    xOffset: 1,
    yOffset: 0,
    boardId,
  });

  const layoutId = createId();
  await db.insert(layouts).values({
    id: layoutId,
    name: "Base",
    columnCount: 13,
    rightGutterColumnCount: 1,
    breakpoint: 768,
    role: "base",
    boardId,
  });

  const demoWidgets = buildDemoWidgets(appIds, customWidgetDefinitionId);
  for (const widget of demoWidgets) {
    let sectionId = mainSectionId;
    if (widget.section === "right") {
      sectionId = rightSectionId;
    }

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
      xOffset: widget.xOffset,
      yOffset: widget.yOffset,
      width: widget.width,
      height: widget.height,
    });
    if (widget.needsIntegration) {
      await db.insert(integrationItems).values({
        itemId,
        integrationId,
      });
    }
  }

  await db.update(users).set({ homeBoardId: boardId }).where(eq(users.id, userId));

  console.log(
    "Demo mode enabled: created demo user, mock integration, and sample board with widgets. Disable by setting DEMO_MODE=false.",
  );
};

const seedDefaultCustomWidgetsAsync = async (db: Database) => {
  const seedIds = BUNDLED_CUSTOM_WIDGETS.map(({ id }) => id);
  const existing = await db.query.customWidgetDefinitions.findMany({
    columns: { id: true },
    where: inArray(customWidgetDefinitions.id, seedIds),
  });
  const existingIds = new Set(existing.map(({ id }) => id));
  const values = BUNDLED_CUSTOM_WIDGETS.filter(({ id }) => !existingIds.has(id)).map(({ id, widget }) => {
    const definition = customWidgetDefinitionSchema.parse(widget);
    return {
      id,
      name: definition.name,
      description: definition.description ?? null,
      iconUrl: definition.iconUrl ?? null,
      sources: SuperJSON.stringify(definition.sources),
      requests: SuperJSON.stringify(definition.requests),
      options: SuperJSON.stringify(definition.options),
      template: definition.template,
      enabled: false,
      creatorId: null,
    };
  });
  if (values.length === 0) {
    console.log("Skipping seeding of bundled custom widgets because they already exist");
    return;
  }
  await db.insert(customWidgetDefinitions).values(values);
  console.log(`Created ${values.length} bundled custom widgets through seeding process`);
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
  const layout = board.layouts.find((candidate) => candidate.role === "base") ?? board.layouts[0];
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
