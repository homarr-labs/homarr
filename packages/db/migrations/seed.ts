import { createId, objectKeys } from "@homarr/common";
import {
  createDocumentationLink,
  defaultBookmarkApps,
  everyoneGroup,
  getIntegrationDefaultUrl,
  getIntegrationName,
  integrationKinds,
} from "@homarr/definitions";
import { defaultServerSettings, defaultServerSettingsKeys } from "@homarr/server-settings";

import type { Database } from "..";
import { eq } from "..";
import {
  getServerSettingByKeyAsync,
  insertServerSettingByKeyAsync,
  updateServerSettingByKeyAsync,
} from "../queries/server-setting";
import { apps, boards, groups, integrations, layouts, onboarding, searchEngines, sections } from "../schema";
import type { Integration } from "../schema";

export const seedDataAsync = async (db: Database) => {
  await seedEveryoneGroupAsync(db);
  await seedOnboardingAsync(db);
  await seedServerSettingsAsync(db);
  await seedDefaultSearchEnginesAsync(db);
  await seedDefaultIntegrationsAsync(db);
  await seedDefaultAppsAsync(db);
  await seedDefaultBoardAsync(db);
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

    if (defaultUrl !== undefined) {
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
