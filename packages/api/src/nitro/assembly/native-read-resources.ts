import { and, asc, eq, inArray, like, max, not, or } from "drizzle-orm";

import type { SqliteSchema } from "@homarr/db/schema";
import { selectInviteSchema } from "@homarr/db/validationSchemas";

import type { GroupAdministrationResources } from "../routers/-identity/resources";
import { settingsCodec } from "../routers/-settings-setup/settings";
import type { AuthenticatedReadAssemblyResources } from "./authenticated-read";

export interface NativeReadResourcesInput {
  readonly schema: Pick<
    SqliteSchema,
    | "serverSettings"
    | "boards"
    | "users"
    | "boardUserPermissions"
    | "boardGroupPermissions"
    | "groupMembers"
    | "searchEngines"
    | "groups"
    | "apiKeys"
    | "invites"
  >;
  readonly version: string;
  readonly createId: GroupAdministrationResources["createId"];
  readonly providers: GroupAdministrationResources["providers"];
}

export function createNativeReadResources(input: NativeReadResourcesInput): AuthenticatedReadAssemblyResources {
  const { schema, version, createId, providers } = input;

  return {
    version,
    serverSettings: {
      serverSettings: schema.serverSettings,
      boards: schema.boards,
      operators: { eq, and },
      inArray,
      codec: settingsCodec,
    },
    preferences: {
      tables: {
        users: schema.users,
        boards: schema.boards,
        boardUserPermissions: schema.boardUserPermissions,
        boardGroupPermissions: schema.boardGroupPermissions,
        groupMembers: schema.groupMembers,
        searchEngines: schema.searchEngines,
      },
      operators: { eq, inArray, or },
    },
    groups: {
      tables: {
        groups: schema.groups,
        users: schema.users,
        groupMembers: schema.groupMembers,
      },
      operators: { eq, and, like, not, max },
      createId,
      providers,
    },
    apiKeys: {
      tables: { apiKeys: schema.apiKeys },
      operators: { eq },
    },
    invites: {
      tables: { invites: schema.invites },
      operators: { eq, asc },
      validation: { selectInviteSchema },
      createId,
      providers,
    },
  };
}
