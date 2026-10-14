import { ORPCError } from "@orpc/server";

import { constructIntegrationPermissions, snapshotPolicyIdentity } from "@homarr/auth/nitro/policy";
import type { PolicyIdentity, ResourceGrants } from "@homarr/auth/nitro/policy";
import type { SQL } from "@homarr/db";
import { integrationKinds } from "@homarr/definitions";
import type { IntegrationPermission } from "@homarr/definitions";

import type { AuthenticatedBackendContext } from "../../context";
import type { IntegrationManagementResources, IntegrationManagementSnapshot } from "./resources";

const globalIntegrationPermissions = [
  "integration-use-all",
  "integration-interact-all",
  "integration-full-all",
] as const;

export async function withManagementSnapshot<TResult>(
  resources: Pick<IntegrationManagementResources, "acquireSnapshotAsync">,
  context: AuthenticatedBackendContext,
  operation: (snapshot: IntegrationManagementSnapshot) => Promise<TResult>,
  mode: "read" | "mutation" = "read",
): Promise<TResult> {
  context.signal.throwIfAborted();
  const snapshot = await resources.acquireSnapshotAsync(context);
  try {
    if (snapshot.principal.kind !== "authenticated" || snapshot.principal.user.id !== context.principal.user.id) {
      throw new ORPCError("UNAUTHORIZED");
    }
    context.signal.throwIfAborted();
    await snapshot.assertCurrentAsync();
    const result = await operation(snapshot);
    if (mode === "read") await snapshot.assertCurrentAsync();
    context.signal.throwIfAborted();
    return result;
  } finally {
    await snapshot.releaseAsync();
  }
}

export function createIntegrationAccessHelpers(
  resources: Pick<IntegrationManagementResources, "tables" | "operators">,
) {
  const { eq, inArray } = resources.operators;
  const { groupMembers, integrationUserPermissions, integrationGroupPermissions } = resources.tables;

  async function getIdentityAsync(snapshot: IntegrationManagementSnapshot): Promise<PolicyIdentity> {
    const members = await snapshot.db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, snapshot.principal.user.id),
    });
    await snapshot.assertCurrentAsync();
    return snapshotPolicyIdentity({
      type: "authenticated",
      userId: snapshot.principal.user.id,
      permissions: snapshot.principal.user.permissions,
      groupIds: members.map(({ groupId }) => groupId),
    });
  }

  function getIntegrationAccessRelations(identity: PolicyIdentity) {
    if (identity.type !== "authenticated") throw new ORPCError("UNAUTHORIZED");
    return {
      userPermissions: { where: eq(integrationUserPermissions.userId, identity.userId) },
      groupPermissions: { where: inArray(integrationGroupPermissions.groupId, [...identity.groupIds]) },
    };
  }

  function hasIntegrationQueryAccess(identity: PolicyIdentity, integration: ResourceGrants<IntegrationPermission>) {
    return (
      (identity.type === "authenticated" &&
        globalIntegrationPermissions.some((permission) => identity.permissions.includes(permission))) ||
      constructIntegrationPermissions(integration, identity).hasUseAccess
    );
  }

  async function getAccessibleIntegrationsAsync(snapshot: IntegrationManagementSnapshot, where?: SQL) {
    const identity = await getIdentityAsync(snapshot);
    const rows = await snapshot.db.query.integrations.findMany({
      where,
      with: getIntegrationAccessRelations(identity),
    });
    await snapshot.assertCurrentAsync();
    return rows
      .filter((integration) => hasIntegrationQueryAccess(identity, integration))
      .map((integration) => ({
        id: integration.id,
        name: integration.name,
        kind: integration.kind,
        url: integration.url,
        permissions: constructIntegrationPermissions(integration, identity),
      }))
      .toSorted(
        (left, right) =>
          integrationKinds.indexOf(left.kind) - integrationKinds.indexOf(right.kind) ||
          left.name.localeCompare(right.name) ||
          left.id.localeCompare(right.id),
      );
  }

  async function throwIfActionForbiddenAsync(
    snapshot: IntegrationManagementSnapshot,
    where: SQL,
    permission: IntegrationPermission,
  ) {
    const identity = await getIdentityAsync(snapshot);
    const rows = await snapshot.db.query.integrations.findMany({
      where,
      columns: { id: true },
      with: getIntegrationAccessRelations(identity),
    });
    await snapshot.assertCurrentAsync();
    if (
      rows.length !== 1 ||
      !rows.every((integration) => {
        const access = constructIntegrationPermissions(integration, identity);
        return (
          access.hasFullAccess ||
          (permission === "interact" && access.hasInteractAccess) ||
          (permission === "use" && (access.hasUseAccess || access.hasInteractAccess))
        );
      })
    )
      throw new ORPCError("NOT_FOUND", { message: "Integration not found" });
  }

  return {
    getIdentityAsync,
    getIntegrationAccessRelations,
    hasIntegrationQueryAccess,
    getAccessibleIntegrationsAsync,
    throwIfActionForbiddenAsync,
  };
}
