import SuperJSON from "superjson";

import { createId, objectKeys } from "@homarr/common";
import { customWidgetImportSchema } from "@homarr/validation/custom-widget";
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
  customWidgetDefinitions,
} from "../schema";
import type { Integration } from "../schema";

const isTruthyEnv = (value: string | undefined) => ["1", "yes", "t", "true"].includes((value ?? "").toLowerCase());

const CUSTOM_WIDGET_SEEDS: Array<{ id: string; data: Record<string, unknown> }> = [
  {
    id: "seed-dog-facts",
    data: {
      $schema: "homarr-custom-widget-v2",
      name: "Random Dog Fact",
      description: "Displays a random fun fact about dogs",
      url: "https://dogapi.dog/api/v2/facts",
      authType: "none",
      method: "GET",
      displayType: "singleValue",
      displayConfig: {
        type: "singleValue",
        jsonPath: "$.data[0].attributes.body",
        label: "Dog Fact",
        unit: "",
        valueSize: "sm",
        labelPosition: "above",
      },
    },
  },
  {
    id: "seed-currency-exchange",
    data: {
      $schema: "homarr-custom-widget-v2",
      name: "Currency Exchange (JPY)",
      description: "Converts 50 Japanese Yen to EUR and USD using European Central Bank rates",
      url: "https://api.frankfurter.dev/v1/latest?from=JPY&to=EUR,USD&amount=50",
      authType: "none",
      method: "GET",
      displayType: "keyValue",
      displayConfig: {
        type: "keyValue",
        mappings: [
          { label: "50 JPY → EUR", jsonPath: "$.rates.EUR", unit: "€" },
          { label: "50 JPY → USD", jsonPath: "$.rates.USD", unit: "$" },
        ],
        layout: "list",
        columns: 2,
      },
    },
  },
  {
    id: "seed-jellyfin",
    data: {
      $schema: "homarr-custom-widget-v2",
      name: "Jellyfin library",
      description: "Counts the number of movies, series, episodes and songs in the library",
      iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/jellyfin.svg",
      url: "https://jellyfin.homelab.com/Items/Counts",
      authType: "apiKeyHeader",
      headerName: "X-Emby-Token",
      method: "GET",
      requestBody: null,
      displayType: "countGrid",
      displayConfig: {
        type: "countGrid",
        items: [
          { label: "Movies", jsonPath: "$.MovieCount", unit: "" },
          { label: "Series", jsonPath: "$.SeriesCount", unit: "" },
          { label: "Episodes", jsonPath: "$.EpisodeCount", unit: "" },
          { label: "Songs", jsonPath: "$.SongCount", unit: "" },
        ],
        columns: 4,
        valueSize: "lg",
      },
    },
  },
  {
    id: "seed-pokedex",
    data: {
      $schema: "homarr-custom-widget-v2",
      name: "Pokédex",
      description: "Browseable Pokémon list",
      iconUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png",
      url: "https://pokeapi.co/api/v2/pokemon?limit=75",
      authType: "none",
      headerName: null,
      method: "GET",
      requestBody: null,
      displayType: "customJsx",
      displayConfig: {
        type: "customJsx",
        template:
          '<Stack gap="md" p="xs">\n  <Card\n    withBorder\n    radius="xl"\n    p="md"\n    shadow="md"\n    style={{\n      background: "linear-gradient(135deg, rgba(250,82,82,0.22), rgba(253,126,20,0.10), rgba(255,255,255,0.03))",\n      border: "1px solid rgba(250,82,82,0.35)",\n      overflow: "hidden"\n    }}\n  >\n    <Group justify="space-between" wrap="nowrap">\n      <Stack gap={2}>\n        <Title order={3}>Pokédex</Title>\n      </Stack>\n    </Group>\n  </Card>\n\n  <PaginatedList pageSize={12}>\n    <Grid gutter="sm">\n      {data.results.map((pokemon, i) =>\n        <Grid.Col span={1.5}>\n          <Anchor href={pokemon.url} target="_blank" underline="never">\n            <Card\n              withBorder\n              radius="xl"\n              p="xs"\n              shadow="md"\n              style={{\n                cursor: "pointer",\n                position: "relative",\n                overflow: "hidden",\n                minHeight: 190,\n                background: "linear-gradient(160deg, rgba(255,255,255,0.12), rgba(250,82,82,0.10), rgba(0,0,0,0.04))",\n                border: "1px solid rgba(250,82,82,0.28)",\n                transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease"\n              }}\n            >\n              <Stack gap="sm" align="center">\n                <Group justify="space-between" wrap="nowrap" style={{ width: "100%" }}>\n                  <Badge size="sm" color="red" variant="filled">\n                    #{String(i + 1).padStart(3, "0")}\n                  </Badge>\n                  <Text fw={800} tt="capitalize" ta="right" truncate style={{ maxWidth: 120 }}>\n                    {pokemon.name}\n                  </Text>\n                </Group>\n\n                <Paper\n                  radius="xl"\n                  p="xs"\n                  withBorder\n                  style={{\n                    background: "radial-gradient(circle, rgba(255,255,255,0.95), rgba(250,82,82,0.16))",\n                    border: "1px solid rgba(255,255,255,0.45)",\n                    boxShadow: "inset 0 0 20px rgba(255,255,255,0.25)"\n                  }}\n                >\n                  <Avatar\n                    src={"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + String(i + 1) + ".png"}\n                    alt={pokemon.name}\n                    size={92}\n                    radius="xl"\n                    style={{\n                      transition: "transform 180ms ease",\n                      filter: "drop-shadow(0 8px 10px rgba(0,0,0,0.25))"\n                    }}\n                  />\n                </Paper>\n              </Stack>\n            </Card>\n          </Anchor>\n        </Grid.Col>\n      )}\n    </Grid>\n  </PaginatedList>\n</Stack>',
      },
    },
  },
];

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

const seedDefaultCustomWidgetsAsync = async (db: Database) => {
  const seedIds = CUSTOM_WIDGET_SEEDS.map((s) => s.id);
  const existing = await db.query.customWidgetDefinitions.findMany({
    columns: { id: true },
    where: inArray(customWidgetDefinitions.id, seedIds),
  });
  const existingIds = new Set(existing.map((row) => row.id));

  const seedValues = CUSTOM_WIDGET_SEEDS.filter((seed) => !existingIds.has(seed.id)).map((seed) => {
    const parsed = customWidgetImportSchema.parse(seed.data);
    return {
      id: seed.id,
      name: parsed.name,
      description: parsed.description ?? null,
      iconUrl: parsed.iconUrl ?? null,
      url: parsed.url,
      authType: parsed.authType,
      headerName: parsed.headerName ?? null,
      method: parsed.method,
      requestBody: parsed.requestBody ?? null,
      displayType: parsed.displayType,
      displayConfig: SuperJSON.stringify(parsed.displayConfig),
      enabled: false,
      creatorId: null,
    };
  });

  if (seedValues.length === 0) {
    console.log("Skipping seeding of default custom widgets as they already exist");
    return;
  }

  await db.insert(customWidgetDefinitions).values(seedValues);

  console.log(`Created ${seedValues.length} default custom widgets through seeding process`);
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
