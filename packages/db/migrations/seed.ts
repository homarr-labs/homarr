import { objectKeys } from "@homarr/common";
import { createDocumentationLink, everyoneGroup } from "@homarr/definitions";
import { defaultServerSettings, defaultServerSettingsKeys } from "@homarr/server-settings";

import type { Database } from "..";
import { createId, eq } from "..";
import {
  getServerSettingByKeyAsync,
  insertServerSettingByKeyAsync,
  updateServerSettingByKeyAsync,
} from "../queries/server-setting";
import { onboarding, searchEngines } from "../schema";
import { groups } from "../schema/mysql";

export const seedDataAsync = async (db: Database) => {
  await seedEveryoneGroupAsync(db);
  await seedOnboardingAsync(db);
  await seedServerSettingsAsync(db);
  await seedDefaultSearchEnginesAsync(db);
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
