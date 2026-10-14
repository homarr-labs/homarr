import type { RouterClient } from "@orpc/server";

import type { BackendPrincipal } from "../../../../../packages/api/src/nitro/context";
import type { createUserProcedures } from "../../../../../packages/api/src/nitro/routers/user";
import type { createUserEstablishmentProcedures } from "../../../../../packages/api/src/nitro/routers/user-establishment";
import type { createGroupAdministrationProcedures } from "../../../../../packages/api/src/nitro/routers/group";
import type { createGroupMutationsProcedures } from "../../../../../packages/api/src/nitro/routers/group-mutations";
import type { createInviteProcedures } from "../../../../../packages/api/src/nitro/routers/invite";
import type { createApiKeyProcedures } from "../../../../../packages/api/src/nitro/routers/api-keys";
import type { createBoardProcedures } from "../../../../../packages/api/src/nitro/routers/board";
import type { createSearchEngineProcedures } from "../../../../../packages/api/src/nitro/routers/search-engine";
import type { SupportedAuthProvider } from "../../../../../packages/definitions/src/auth";

export interface IdentityClient {
  user: RouterClient<
    Pick<
      ReturnType<typeof createUserProcedures>,
      | "getAll"
      | "getById"
      | "selectable"
      | "editProfile"
      | "setProfileImage"
      | "changePassword"
      | "delete"
      | "getPreferences"
      | "updatePreferences"
      | "resetTours"
      | "getTourStatus"
    > &
      Pick<ReturnType<typeof createUserEstablishmentProcedures>, "create">
  >;
  group: RouterClient<
    Pick<
      ReturnType<typeof createGroupAdministrationProcedures>,
      | "getAll"
      | "getById"
      | "selectable"
      | "createGroup"
      | "updateGroup"
      | "deleteGroup"
      | "transferOwnership"
      | "addMember"
      | "removeMember"
      | "savePartialSettings"
    > &
      ReturnType<typeof createGroupMutationsProcedures>
  >;
  invite: RouterClient<ReturnType<typeof createInviteProcedures>>;
  apiKeys: RouterClient<ReturnType<typeof createApiKeyProcedures>>;
  board: RouterClient<Pick<ReturnType<typeof createBoardProcedures>, "getManageOverview" | "getBoardsForGroup">>;
  searchEngine: RouterClient<Pick<ReturnType<typeof createSearchEngineProcedures>, "getSelectable">>;
}

export type IdentityPrincipal = Extract<BackendPrincipal, { kind: "authenticated" }>;
export type IdentityAuthority =
  | { state: "unavailable"; reason: string }
  | {
      state: "ready";
      principal: IdentityPrincipal;
      authorityKey: string;
      client: IdentityClient;
      demo: { enabled: boolean; readOnly: boolean };
      enabledProviders: readonly SupportedAuthProvider[];
      locallyManagedProviders: readonly SupportedAuthProvider[];
      refreshAuthority: () => Promise<void>;
    };

export type UserDetail = Awaited<ReturnType<IdentityClient["user"]["getById"]>>;
export type GroupDetail = Awaited<ReturnType<IdentityClient["group"]["getById"]>>;
export type GroupList = Awaited<ReturnType<IdentityClient["group"]["getAll"]>>;
export type UserPreferences = Awaited<ReturnType<IdentityClient["user"]["getPreferences"]>>;
export type CreatedInvite = Awaited<ReturnType<IdentityClient["invite"]["createInvite"]>>;
