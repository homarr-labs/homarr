import { parse, stringify } from "superjson";

import type { ServerSettings } from "@homarr/server-settings";
import { defaultServerSettings, defaultServerSettingsKeys } from "@homarr/server-settings";

import type { Database } from "..";
import { eq, sql } from "..";
import { isMysql, isPostgresql } from "../collection";
import type { HomarrDatabaseMysql, HomarrDatabasePostgresql } from "../driver";
import { serverSettings } from "../schema";
import { serverSettings as mysqlServerSettings } from "../schema/mysql";
import { serverSettings as postgresqlServerSettings } from "../schema/postgresql";

interface ExistingBoardLayout {
  boardId: string;
  name: string;
  breakpoint: number;
}

export const shouldEnableAutomaticMobileLayoutForUpgrade = (existingLayouts: ExistingBoardLayout[]) => {
  const layoutCounts = new Map<string, number>();

  for (const layout of existingLayouts) {
    if (layout.name !== "Base" || layout.breakpoint !== 0) {
      return false;
    }

    const nextCount = (layoutCounts.get(layout.boardId) ?? 0) + 1;
    if (nextCount > 1) {
      return false;
    }
    layoutCounts.set(layout.boardId, nextCount);
  }

  return true;
};

const getAutomaticMobileLayoutUpgradeDefaultAsync = async (db: Database) => {
  const existingLayouts = await db.query.layouts.findMany({
    columns: {
      boardId: true,
      name: true,
      breakpoint: true,
    },
  });

  return shouldEnableAutomaticMobileLayoutForUpgrade(existingLayouts);
};

export const getServerSettingsAsync = async (db: Database) => {
  const settings = await db.query.serverSettings.findMany();
  let parsedBoardSettings: Partial<ServerSettings["board"]> = {};

  const mergedSettings = defaultServerSettingsKeys.reduce((acc, settingKey) => {
    const setting = settings.find((candidate) => candidate.settingKey === settingKey);
    if (!setting) {
      // Typescript is not happy because the key is a union and it does not know that they are the same
      acc[settingKey] = { ...defaultServerSettings[settingKey] } as never;
      return acc;
    }

    const persistedSettings = parse<Record<string, unknown>>(setting.value);
    if (settingKey === "board") {
      parsedBoardSettings = persistedSettings as Partial<ServerSettings["board"]>;
    }
    acc[settingKey] = {
      ...defaultServerSettings[settingKey],
      ...persistedSettings,
    } as never;
    return acc;
  }, {} as ServerSettings);

  if (typeof parsedBoardSettings.enableAutomaticMobileLayout !== "boolean") {
    mergedSettings.board.enableAutomaticMobileLayout = await getAutomaticMobileLayoutUpgradeDefaultAsync(db);
  }

  return mergedSettings;
};

export const getServerSettingByKeyAsync = async <TKey extends keyof ServerSettings>(db: Database, key: TKey) => {
  const dbSettings = await db.query.serverSettings.findFirst({
    where: eq(serverSettings.settingKey, key),
  });

  if (!dbSettings) {
    if (key === "board") {
      return {
        ...defaultServerSettings.board,
        enableAutomaticMobileLayout: await getAutomaticMobileLayoutUpgradeDefaultAsync(db),
      } as ServerSettings[TKey];
    }

    return defaultServerSettings[key];
  }

  const persistedSettings = parse<Partial<ServerSettings[TKey]>>(dbSettings.value);
  const mergedSettings = {
    ...defaultServerSettings[key],
    ...persistedSettings,
  } as ServerSettings[TKey];

  if (
    key === "board" &&
    typeof (persistedSettings as Partial<ServerSettings["board"]>).enableAutomaticMobileLayout !== "boolean"
  ) {
    (mergedSettings as ServerSettings["board"]).enableAutomaticMobileLayout =
      await getAutomaticMobileLayoutUpgradeDefaultAsync(db);
  }

  return mergedSettings;
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

export const mergeServerSettingByKeyAsync = async <TKey extends keyof ServerSettings>(
  db: Database,
  key: TKey,
  value: ServerSettings[TKey],
  patch: Partial<ServerSettings[TKey]>,
) => {
  const serializedValue = stringify(value);
  const serializedPatch = stringify(patch);

  if (isMysql()) {
    await (db as unknown as HomarrDatabaseMysql)
      .insert(mysqlServerSettings)
      .values({ settingKey: key, value: serializedValue })
      .onDuplicateKeyUpdate({
        set: {
          value: sql`JSON_MERGE_PATCH(${mysqlServerSettings.value}, ${serializedPatch})`,
        },
      });
    return;
  }

  if (isPostgresql()) {
    await (db as unknown as HomarrDatabasePostgresql)
      .insert(postgresqlServerSettings)
      .values({ settingKey: key, value: serializedValue })
      .onConflictDoUpdate({
        target: postgresqlServerSettings.settingKey,
        set: {
          value: sql`jsonb_set(
            ${postgresqlServerSettings.value}::jsonb,
            '{json}',
            (${postgresqlServerSettings.value}::jsonb -> 'json') || (${serializedPatch}::jsonb -> 'json'),
            true
          )::text`,
        },
      });
    return;
  }

  await db
    .insert(serverSettings)
    .values({ settingKey: key, value: serializedValue })
    .onConflictDoUpdate({
      target: serverSettings.settingKey,
      set: {
        value: sql`json_patch(${serverSettings.value}, ${serializedPatch})`,
      },
    });
};
