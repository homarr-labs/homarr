import { ORPCError } from "@orpc/server";

import type * as operators from "@homarr/db";
import type * as schema from "@homarr/db/schema";
import type { selectInviteSchema, selectUserSchema } from "@homarr/db/validationSchemas";
import type { SupportedAuthProvider } from "@homarr/definitions";
import { supportedAuthProviders } from "@homarr/definitions";

export type IdentityTables = Pick<
  typeof schema,
  | "users"
  | "groups"
  | "groupMembers"
  | "invites"
  | "apiKeys"
  | "boards"
  | "boardUserPermissions"
  | "boardGroupPermissions"
  | "searchEngines"
>;

export type IdentityOperators = Pick<
  typeof operators,
  "eq" | "and" | "or" | "inArray" | "like" | "not" | "asc" | "max"
>;

export interface IdentityProviderConfiguration {
  readonly enabled: readonly SupportedAuthProvider[];
  readonly oidcGroupsLocalManagement: boolean;
}

export interface IdentityProcedureResources {
  readonly tables: IdentityTables;
  readonly operators: IdentityOperators;
  readonly validation: {
    readonly selectUserSchema: typeof selectUserSchema;
    readonly selectInviteSchema: typeof selectInviteSchema;
  };
  createId(): string;
  providers(): IdentityProviderConfiguration;
  readonly logger: { info(message: string, metadata: Record<string, unknown>): void };
}

export interface PreferenceProcedureResources {
  readonly tables: Pick<
    IdentityTables,
    "users" | "boards" | "boardUserPermissions" | "boardGroupPermissions" | "groupMembers" | "searchEngines"
  >;
  readonly operators: Pick<IdentityOperators, "eq" | "inArray" | "or">;
}

export interface UserProcedureResources extends PreferenceProcedureResources {
  readonly operators: Pick<IdentityOperators, "eq" | "inArray" | "or" | "and" | "like">;
  readonly validation: Pick<IdentityProcedureResources["validation"], "selectUserSchema">;
  readonly logger: IdentityProcedureResources["logger"];
}

export interface GroupAdministrationResources extends Pick<IdentityProcedureResources, "createId" | "providers"> {
  readonly tables: Pick<IdentityTables, "groups" | "users" | "groupMembers">;
  readonly operators: Pick<IdentityOperators, "eq" | "and" | "like" | "not" | "max">;
}

export interface InviteProcedureResources extends Pick<IdentityProcedureResources, "createId" | "providers"> {
  readonly tables: Pick<IdentityTables, "invites">;
  readonly operators: Pick<IdentityOperators, "eq" | "asc">;
  readonly validation: Pick<IdentityProcedureResources["validation"], "selectInviteSchema">;
}

export interface ApiKeyProcedureResources {
  readonly tables: Pick<IdentityTables, "apiKeys">;
  readonly operators: Pick<IdentityOperators, "eq">;
}

export function throwIfCredentialsDisabled(resources: Pick<IdentityProcedureResources, "providers">) {
  if (!resources.providers().enabled.includes("credentials")) {
    throw new ORPCError("FORBIDDEN", { message: "Credentials provider is disabled" });
  }
}

export function isGroupMembershipManagedLocally(
  provider: SupportedAuthProvider,
  config: IdentityProviderConfiguration,
) {
  switch (provider) {
    case "credentials":
      return true;
    case "oidc":
      return config.oidcGroupsLocalManagement;
    default:
      return false;
  }
}

export function throwIfGroupMembersCannotBeManagedLocally(resources: Pick<IdentityProcedureResources, "providers">) {
  const config = resources.providers();
  const manageable = supportedAuthProviders.some(
    (provider) => config.enabled.includes(provider) && isGroupMembershipManagedLocally(provider, config),
  );
  if (!manageable) throw new ORPCError("FORBIDDEN", { message: "Group members cannot be managed locally" });
}
