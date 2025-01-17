import SuperJSON from "superjson";

import { objectKeys } from "@homarr/common";
import { everyoneGroup } from "@homarr/definitions";
import { defaultServerSettings, defaultServerSettingsKeys } from "@homarr/server-settings";

import { createId, eq } from "..";
import type { Database } from "..";
import { onboarding, serverSettings } from "../schema";
import { groups } from "../schema/mysql";

export const seedDataAsync = async (db: Database) => {
  await seedEveryoneGroupAsync(db);
  await seedOnboardingAsync(db);
  await seedServerSettingsAsync(db);
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
