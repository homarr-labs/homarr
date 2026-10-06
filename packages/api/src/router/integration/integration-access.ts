import { TRPCError } from "@trpc/server";

import type { Session } from "@homarr/auth";
import type { IntegrationPermissionsProps } from "@homarr/auth/shared";
import { constructIntegrationPermissions } from "@homarr/auth/shared";
import type { Database, SQL } from "@homarr/db";
import { eq, inArray } from "@homarr/db";
import { groupMembers, integrationGroupPermissions, integrations, integrationUserPermissions } from "@homarr/db/schema";
import type { IntegrationPermission } from "@homarr/definitions";

const hasIntegrationPermission = (
  integration: IntegrationPermissionsProps,
  session: Session | null,
  permission: IntegrationPermission,
) => {
  const { hasUseAccess, hasInteractAccess, hasFullAccess } = constructIntegrationPermissions(integration, session);
  if (hasFullAccess) return true;
  if (permission === "interact") return hasInteractAccess;
  if (permission === "use") return hasUseAccess || hasInteractAccess;
  return false;
};

const throwIfActionsForbiddenAsync = async (
  ctx: { db: Database; session: Session | null },
  integrationWhere: SQL<unknown>,
  expectedCount: number,
  permission: IntegrationPermission,
) => {
  const { db, session } = ctx;
  const groupsOfCurrentUser = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, session?.user.id ?? ""),
  });
  const integrationRecords = await db.query.integrations.findMany({
    where: integrationWhere,
    columns: { id: true },
    with: {
      userPermissions: {
        where: eq(integrationUserPermissions.userId, session?.user.id ?? ""),
      },
      groupPermissions: {
        where: inArray(
          integrationGroupPermissions.groupId,
          groupsOfCurrentUser.map(({ groupId }) => groupId).concat(""),
        ),
      },
    },
  });

  if (
    integrationRecords.length !== expectedCount ||
    !integrationRecords.every((integration) => hasIntegrationPermission(integration, session, permission))
  ) {
    notAllowed();
  }
};

/**
 * Throws NOT_FOUND if user is not allowed to perform action on integration
 * @param ctx trpc router context
 * @param integrationWhere where clause for the integration
 * @param permission permission required to perform action on integration
 */
export const throwIfActionForbiddenAsync = async (
  ctx: { db: Database; session: Session | null },
  integrationWhere: SQL<unknown>,
  permission: IntegrationPermission,
) => {
  await throwIfActionsForbiddenAsync(ctx, integrationWhere, 1, permission);
};

export const throwIfIntegrationActionsForbiddenAsync = async (
  ctx: { db: Database; session: Session | null },
  integrationIds: readonly string[],
  permission: IntegrationPermission,
) => {
  const uniqueIntegrationIds = [...new Set(integrationIds)];
  if (uniqueIntegrationIds.length === 0) return;

  await throwIfActionsForbiddenAsync(
    ctx,
    inArray(integrations.id, uniqueIntegrationIds),
    uniqueIntegrationIds.length,
    permission,
  );
};

/**
 * This method returns NOT_FOUND to prevent snooping on board existence
 * A function is used to use the method without return statement
 */
function notAllowed(): never {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Integration not found",
  });
}
