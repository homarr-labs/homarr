import { TRPCError } from "@trpc/server";

import type { Session } from "@homarr/auth";
import { constructIntegrationPermissions } from "@homarr/auth/shared";
import type { Database, SQL } from "@homarr/db";
import { eq, inArray } from "@homarr/db";
import { groupMembers, integrationGroupPermissions, integrations, integrationUserPermissions } from "@homarr/db/schema";
import type { IntegrationPermission } from "@homarr/definitions";

interface IntegrationPermissionRecord {
  userPermissions: { permission: IntegrationPermission }[];
  groupPermissions: { permission: IntegrationPermission }[];
}

const hasIntegrationPermission = (
  integration: IntegrationPermissionRecord,
  session: Session | null,
  permission: IntegrationPermission,
) => {
  const { hasUseAccess, hasInteractAccess, hasFullAccess } = constructIntegrationPermissions(integration, session);
  if (hasFullAccess) return true;
  if (permission === "interact") return hasInteractAccess;
  if (permission === "use") return hasUseAccess;
  return false;
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
  const { db, session } = ctx;
  const groupsOfCurrentUser = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, session?.user.id ?? ""),
  });
  const integration = await db.query.integrations.findFirst({
    where: integrationWhere,
    columns: {
      id: true,
    },
    with: {
      userPermissions: {
        where: eq(integrationUserPermissions.userId, session?.user.id ?? ""),
      },
      groupPermissions: {
        where: inArray(
          integrationGroupPermissions.groupId,
          groupsOfCurrentUser.map((group) => group.groupId).concat(""),
        ),
      },
    },
  });

  if (!integration) {
    notAllowed();
  }

  if (hasIntegrationPermission(integration, session, permission)) return;

  notAllowed();
};

/**
 * Batched variant for feature configuration flows. It applies the same direct
 * user, group, and global permission rules without issuing one query per ID.
 */
export const throwIfIntegrationActionsForbiddenAsync = async (
  ctx: { db: Database; session: Session | null },
  integrationIds: readonly string[],
  permission: IntegrationPermission,
) => {
  const uniqueIntegrationIds = [...new Set(integrationIds)];
  if (uniqueIntegrationIds.length === 0) return;

  const { db, session } = ctx;
  const groupsOfCurrentUser = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, session?.user.id ?? ""),
  });
  const integrationRecords = await db.query.integrations.findMany({
    where: inArray(integrations.id, uniqueIntegrationIds),
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
    integrationRecords.length !== uniqueIntegrationIds.length ||
    !integrationRecords.every((integration) => hasIntegrationPermission(integration, session, permission))
  ) {
    notAllowed();
  }
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
