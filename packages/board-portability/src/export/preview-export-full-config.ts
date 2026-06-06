import type { Database } from "@homarr/db";
import {
  groups,
  integrationSecrets,
  integrations,
  items,
  layouts,
  searchEngines,
  sections,
  serverSettings,
  users,
} from "@homarr/db/schema";

import type { ConfigExportPreview } from "../types";

export const previewExportFullConfigAsync = async (db: Database): Promise<ConfigExportPreview> => {
  const allBoards = await db.query.boards.findMany();
  const allApps = await db.query.apps.findMany();
  const allIntegrations = await db.select().from(integrations);
  const allSecrets = await db.select().from(integrationSecrets);
  const allItems = await db.select().from(items);
  const allSections = await db.select().from(sections);
  const allLayouts = await db.select().from(layouts);
  const allSearchEngines = await db.select().from(searchEngines);
  const allGroups = await db.select().from(groups);
  const allUsers = await db.select().from(users);
  const allServerSettings = await db.select().from(serverSettings);

  return {
    boards: allBoards.length,
    apps: allApps.length,
    integrations: allIntegrations.length,
    secrets: allSecrets.length,
    widgets: allItems.length,
    sections: allSections.length,
    layouts: allLayouts.length,
    searchEngines: allSearchEngines.length,
    groups: allGroups.length,
    users: allUsers.length,
    serverSettings: allServerSettings.length,
  };
};
