import SuperJSON from "superjson";

import { db } from "@homarr/db";
import { serverSettings } from "@homarr/db/schema/sqlite";
import { logger } from "@homarr/log";

import {
  defaultServerSettings,
  defaultServerSettingsKeys,
} from "../../../packages/server-settings";

export const seedServerSettings = async () => {
  const serverSettingsData = await db.query.serverSettings.findMany();
  let insertedSettingsCount = 0;

  for (const settingsKey of defaultServerSettingsKeys) {
    if (
      serverSettingsData.some((setting) => setting.settingKey === settingsKey)
    ) {
      return;
    }

    await db.insert(serverSettings).values({
      settingKey: settingsKey,
      value: SuperJSON.stringify(defaultServerSettings[settingsKey]),
    });
    insertedSettingsCount++;
  }

  if (insertedSettingsCount > 0) {
    logger.info(`Inserted ${insertedSettingsCount} missing settings`);
  }
};
