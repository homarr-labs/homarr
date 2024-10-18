import SuperJSON from "superjson";

import { everyoneGroup } from "@homarr/definitions";
import { defaultServerSettings, defaultServerSettingsKeys } from "@homarr/server-settings";

import { createId, eq } from "..";
import type { Database } from "..";
import { groups } from "../schema/mysql";
import { serverSettings } from "../schema/sqlite";

export const seedDataAsync = async (db: Database) => {
  await seedEveryoneGroupAsync(db);
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

const seedServerSettingsAsync = async (db: Database) => {
  const serverSettingsData = await db.query.serverSettings.findMany();
  let insertedSettingsCount = 0;

  for (const settingsKey of defaultServerSettingsKeys) {
    if (serverSettingsData.some((setting) => setting.settingKey === settingsKey)) {
      return;
    }

    await db.insert(serverSettings).values({
      settingKey: settingsKey,
      value: SuperJSON.stringify(defaultServerSettings[settingsKey]),
    });
    insertedSettingsCount++;
  }

  if (insertedSettingsCount > 0) {
    console.info(`Inserted ${insertedSettingsCount} missing settings`);
  }
};
