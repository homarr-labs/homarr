import { parse, stringify } from "superjson";

import type { and as drizzleAnd, Database, eq as drizzleEq } from "@homarr/db";
import type { serverSettings } from "@homarr/db/schema";
import { defaultServerSettings, defaultServerSettingsKeys, parseBrandingSettings } from "@homarr/server-settings";
import type { ServerSettings } from "@homarr/server-settings";

export interface SettingsResources {
  readonly serverSettings: typeof serverSettings;
  readonly operators: { readonly eq: typeof drizzleEq; readonly and: typeof drizzleAnd };
  readonly codec: { readonly parse: typeof parse; readonly stringify: typeof stringify };
}

export const settingsCodec = Object.freeze({ parse, stringify });

export function createSettingsStore(resources: SettingsResources) {
  const {
    serverSettings,
    codec,
    operators: { eq, and },
  } = resources;

  function decode<Key extends keyof ServerSettings>(key: Key, serialized?: string): ServerSettings[Key] {
    if (serialized === undefined) return defaultServerSettings[key];
    const value = codec.parse<ServerSettings[Key]>(serialized);
    return (
      key === "branding" ? parseBrandingSettings(value) : { ...defaultServerSettings[key], ...value }
    ) as ServerSettings[Key];
  }

  async function read<Key extends keyof ServerSettings>(db: Database, key: Key) {
    const row = await db.query.serverSettings.findFirst({ where: eq(serverSettings.settingKey, key) });
    return decode(key, row?.value);
  }

  async function readAll(db: Database): Promise<ServerSettings> {
    const rows = await db.query.serverSettings.findMany();
    return Object.fromEntries(
      defaultServerSettingsKeys.map((key) => [key, decode(key, rows.find((row) => row.settingKey === key)?.value)]),
    ) as ServerSettings;
  }

  async function update<Key extends keyof ServerSettings>(db: Database, key: Key, value: ServerSettings[Key]) {
    await db
      .update(serverSettings)
      .set({ value: codec.stringify(value) })
      .where(eq(serverSettings.settingKey, key));
  }

  async function insert<Key extends keyof ServerSettings>(db: Database, key: Key, value: ServerSettings[Key]) {
    await db.insert(serverSettings).values({ settingKey: key, value: codec.stringify(value) });
  }

  async function updateAnalytics(
    db: Database,
    updateValue: (value: ServerSettings["analytics"]) => ServerSettings["analytics"],
  ) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const row = await db.query.serverSettings.findFirst({ where: eq(serverSettings.settingKey, "analytics") });
      if (!row) throw new Error("Analytics server settings are missing");
      const next = updateValue(decode("analytics", row.value));
      const updated = await db
        .update(serverSettings)
        .set({ value: codec.stringify(next) })
        .where(and(eq(serverSettings.settingKey, "analytics"), eq(serverSettings.value, row.value)))
        .returning({ settingKey: serverSettings.settingKey });
      if (updated.length > 0) return next;
    }
    throw new Error("Analytics server settings changed too often to update");
  }

  return { read, readAll, update, insert, updateAnalytics };
}
