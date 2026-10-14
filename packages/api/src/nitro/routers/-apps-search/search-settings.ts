import { parse, stringify } from "superjson";

import type { Database } from "@homarr/db";
import { defaultServerSettings } from "@homarr/server-settings";
import type { ServerSettings } from "@homarr/server-settings";

import type { SearchEngineProcedureResources } from "./resources";

export async function getSearchServerSettingsAsync(db: Database, resources: SearchEngineProcedureResources) {
  const row = await db.query.serverSettings.findFirst({
    where: resources.operators.eq(resources.tables.serverSettings.settingKey, "search"),
  });
  return row
    ? { ...defaultServerSettings.search, ...parse<ServerSettings["search"]>(row.value) }
    : defaultServerSettings.search;
}

export async function updateSearchServerSettingsAsync(
  db: Database,
  resources: SearchEngineProcedureResources,
  value: ServerSettings["search"],
) {
  await db
    .update(resources.tables.serverSettings)
    .set({ value: stringify(value) })
    .where(resources.operators.eq(resources.tables.serverSettings.settingKey, "search"));
}
