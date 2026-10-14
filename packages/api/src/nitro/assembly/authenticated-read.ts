import { backendContractRevision } from "../context";
import { defineBackendContribution } from "../contribution";
import type { SourceLeafPath } from "../port-map";
import type {
  ApiKeyProcedureResources,
  GroupAdministrationResources,
  InviteProcedureResources,
  PreferenceProcedureResources,
} from "../routers/-identity/resources";
import { createApiKeyProcedures } from "../routers/api-keys";
import { createGroupAdministrationProcedures } from "../routers/group";
import { createInfoProcedures } from "../routers/info";
import { createInviteProcedures } from "../routers/invite";
import { createServerSettingsProcedures } from "../routers/server-settings";
import type { ServerSettingsProcedureResources } from "../routers/server-settings";
import { createUserPreferenceProcedures } from "../routers/user";

export interface AuthenticatedReadAssemblyResources {
  readonly version: string;
  readonly serverSettings: ServerSettingsProcedureResources;
  readonly preferences: PreferenceProcedureResources;
  readonly groups: GroupAdministrationResources;
  readonly apiKeys: ApiKeyProcedureResources;
  readonly invites: InviteProcedureResources;
}

export const authenticatedReadLeaves = Object.freeze([
  "info.getInfo",
  "serverSettings.getAll",
  "serverSettings.getBoardSettings",
  "user.getPreferences",
  "user.getTourStatus",
  "group.getAll",
  "group.getPaginated",
  "group.getById",
  "group.selectable",
  "group.search",
  "apiKeys.getAll",
  "invite.getAll",
] satisfies readonly SourceLeafPath[]);

export function createAuthenticatedReadAssembly(resources: AuthenticatedReadAssemblyResources) {
  const info = createInfoProcedures(resources.version);
  const serverSettings = createServerSettingsProcedures(resources.serverSettings);
  const user = createUserPreferenceProcedures(resources.preferences);
  const group = createGroupAdministrationProcedures(resources.groups);
  const apiKeys = createApiKeyProcedures(resources.apiKeys);
  const invite = createInviteProcedures(resources.invites);

  return defineBackendContribution({
    revision: backendContractRevision,
    id: "homarr.authenticated-read.source-port.v2",
    router: {
      info: { getInfo: info.getInfo },
      serverSettings: {
        getAll: serverSettings.getAll,
        getBoardSettings: serverSettings.getBoardSettings,
      },
      user: {
        getPreferences: user.getPreferences,
        getTourStatus: user.getTourStatus,
      },
      group: {
        getAll: group.getAll,
        getPaginated: group.getPaginated,
        getById: group.getById,
        selectable: group.selectable,
        search: group.search,
      },
      apiKeys: { getAll: apiKeys.getAll },
      invite: { getAll: invite.getAll },
    },
    leaves: authenticatedReadLeaves,
  });
}
