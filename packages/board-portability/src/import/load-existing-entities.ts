import type { Database, InferSelectModel } from "@homarr/db";
import type { groupMembers, groups, searchEngines, serverSettings, users } from "@homarr/db/schema";
import { groupMembers as groupMembersTable, groups as groupsTable, searchEngines as searchEnginesTable, serverSettings as serverSettingsTable, users as usersTable } from "@homarr/db/schema";

export type ExistingEntities = {
  apps: Awaited<ReturnType<Database["query"]["apps"]["findMany"]>>;
  integrations: Awaited<ReturnType<Database["query"]["integrations"]["findMany"]>>;
  boards: Awaited<ReturnType<Database["query"]["boards"]["findMany"]>>;
  groups: InferSelectModel<typeof groups>[];
  searchEngines: InferSelectModel<typeof searchEngines>[];
  users: InferSelectModel<typeof users>[];
  groupMembers: InferSelectModel<typeof groupMembers>[];
  serverSettings: InferSelectModel<typeof serverSettings>[];
};

export const loadExistingEntitiesAsync = async (db: Database): Promise<ExistingEntities> => {
  const [appsResult, integrationsResult, boardsResult, groupsResult, searchEnginesResult, usersResult, groupMembersResult, serverSettingsResult] =
    await Promise.all([
      db.query.apps.findMany(),
      db.query.integrations.findMany(),
      db.query.boards.findMany(),
      db.select().from(groupsTable),
      db.select().from(searchEnginesTable),
      db.select().from(usersTable),
      db.select().from(groupMembersTable),
      db.select().from(serverSettingsTable),
    ]);

  return {
    apps: appsResult,
    integrations: integrationsResult,
    boards: boardsResult,
    groups: groupsResult,
    searchEngines: searchEnginesResult,
    users: usersResult,
    groupMembers: groupMembersResult,
    serverSettings: serverSettingsResult,
  };
};
