import SuperJSON from "superjson";

import { objectKeys } from "@homarr/common";
import { everyoneGroup } from "@homarr/definitions";
import { defaultServerSettings, defaultServerSettingsKeys } from "@homarr/server-settings";

import type { Database } from "..";
import { createId, eq } from "..";
import { onboarding, searchEngines, serverSettings } from "../schema";
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
  const existingSearchEngines = await db.query.searchEngines.findMany();
  
  if (existingSearchEngines.length > 0) {
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
      urlTemplate: "https://homarr.dev/search?q=%s",
      type: "generic" as const,
      integrationId: null,
    },
  ];

  await db.insert(searchEngines).values(defaultSearchEngines);
  console.log(`Created ${defaultSearchEngines.length} default search engines through seeding process`);
  
  // Set Homarr docs as the default search engine in server settings
  const searchSettings = await db.query.serverSettings.findFirst({
    where: eq(serverSettings.settingKey, "search"),
  });

  if (searchSettings) {
    const currentSettings = SuperJSON.parse<Record<string, unknown>>(searchSettings.value);
    
    if (!currentSettings.defaultSearchEngineId) {
      await db
        .update(serverSettings)
        .set({
          value: SuperJSON.stringify({ ...currentSettings, defaultSearchEngineId: homarrId }),
        })
        .where(eq(serverSettings.settingKey, "search"));
      console.log("Set Homarr docs as the default search engine");
    }
  } else {
    await db.insert(serverSettings).values({
      settingKey: "search",
      value: SuperJSON.stringify({ defaultSearchEngineId: homarrId }),
    });
    console.log("Created search settings with Homarr docs as the default search engine");
  }
};

const seedServerSettingsAsync = async (db: Database) => {
  const serverSettingsData = await db.query.serverSettings.findMany();

  for (const settingsKey of defaultServerSettingsKeys) {
    const currentDbEntry = serverSettingsData.find((setting) => setting.settingKey === settingsKey);
    if (!currentDbEntry) {
      await db.insert(serverSettings).values({
        settingKey: settingsKey,
        value: SuperJSON.stringify(defaultServerSettings[settingsKey]),
      });
      console.log(`Created serverSetting through seed key=${settingsKey}`);
      continue;
    }

    const currentSettings = SuperJSON.parse<Record<string, unknown>>(currentDbEntry.value);
    const defaultSettings = defaultServerSettings[settingsKey];
    const missingKeys = objectKeys(defaultSettings).filter((key) => !(key in currentSettings));

    if (missingKeys.length === 0) {
      console.info(`Skipping seeding for serverSetting as it already exists key=${settingsKey}`);
      continue;
    }

    await db
      .update(serverSettings)
      .set({
        value: SuperJSON.stringify({ ...defaultSettings, ...currentSettings }), // Add missing keys
      })
      .where(eq(serverSettings.settingKey, settingsKey));
    console.log(`Updated serverSetting through seed key=${settingsKey}`);
  }
};
