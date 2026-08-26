import SuperJSON from "superjson";

import type { ServerSettings } from "@homarr/server-settings";
import { defaultServerSettings, defaultServerSettingsKeys, parseBrandingSettings } from "@homarr/server-settings";

import type { Database } from "..";
import { eq } from "..";
import { serverSettings } from "../schema";

export const getServerSettingsAsync = async (db: Database) => {
  const settings = await db.query.serverSettings.findMany();

  return defaultServerSettingsKeys.reduce((acc, settingKey) => {
    const setting = settings.find((setting) => setting.settingKey === settingKey);
    if (!setting) {
      // Typescript is not happy because the key is a union and it does not know that they are the same
      acc[settingKey] = defaultServerSettings[settingKey] as never;
      return acc;
    }

    const parsedSetting = SuperJSON.parse<Record<string, unknown>>(setting.value);
    if (settingKey === "branding") {
      acc[settingKey] = parseBrandingSettings(parsedSetting) as never;
      return acc;
    }
    acc[settingKey] = {
      ...defaultServerSettings[settingKey],
      ...parsedSetting,
    } as never;
    return acc;
  }, {} as ServerSettings);
};

export const getServerSettingByKeyAsync = async <TKey extends keyof ServerSettings>(db: Database, key: TKey) => {
  const dbSettings = await db.query.serverSettings.findFirst({
    where: eq(serverSettings.settingKey, key),
  });

  if (!dbSettings) {
    return defaultServerSettings[key];
  }

  const parsedSetting = SuperJSON.parse<ServerSettings[TKey]>(dbSettings.value);
  if (key === "branding") {
    return parseBrandingSettings(parsedSetting) as ServerSettings[TKey];
  }
  return {
    ...defaultServerSettings[key],
    ...parsedSetting,
  } as ServerSettings[TKey];
};

export const updateServerSettingByKeyAsync = async <TKey extends keyof ServerSettings>(
  db: Database,
  key: TKey,
  value: ServerSettings[TKey],
) => {
  await db
    .update(serverSettings)
    .set({
      value: SuperJSON.stringify(value),
    })
    .where(eq(serverSettings.settingKey, key));
};

export const insertServerSettingByKeyAsync = async <TKey extends keyof ServerSettings>(
  db: Database,
  key: TKey,
  value: ServerSettings[TKey],
) => {
  await db.insert(serverSettings).values({
    settingKey: key,
    value: SuperJSON.stringify(value),
  });
};
