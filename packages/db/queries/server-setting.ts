import { parse, stringify } from "superjson";

import type { ServerSettings } from "@homarr/server-settings";
import { defaultServerSettings, defaultServerSettingsKeys, parseBrandingSettings } from "@homarr/server-settings";

import type { Database } from "..";
import { and, eq } from "..";
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

    const parsedSetting = parse<Record<string, unknown>>(setting.value);
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

  const parsedSetting = parse<ServerSettings[TKey]>(dbSettings.value);
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
      value: stringify(value),
    })
    .where(eq(serverSettings.settingKey, key));
};

export const updateAnalyticsServerSettingAsync = async (
  db: Database,
  update: (current: ServerSettings["analytics"]) => ServerSettings["analytics"],
) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await db.query.serverSettings.findFirst({
      where: eq(serverSettings.settingKey, "analytics"),
    });
    if (!row) throw new Error("Analytics server settings are missing");

    const current = {
      ...defaultServerSettings.analytics,
      ...parse<ServerSettings["analytics"]>(row.value),
    };
    const next = update(current);
    const updated = await db
      .update(serverSettings)
      .set({ value: stringify(next) })
      .where(and(eq(serverSettings.settingKey, "analytics"), eq(serverSettings.value, row.value)))
      .returning({ settingKey: serverSettings.settingKey });
    if (updated.length > 0) return next;
  }

  throw new Error("Analytics server settings changed too often to update");
};

export const insertServerSettingByKeyAsync = async <TKey extends keyof ServerSettings>(
  db: Database,
  key: TKey,
  value: ServerSettings[TKey],
) => {
  await db.insert(serverSettings).values({
    settingKey: key,
    value: stringify(value),
  });
};
