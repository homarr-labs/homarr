import type { Session } from "next-auth";

import { db, eq, inArray } from "@homarr/db";
import { groupMembers, integrationGroupPermissions, integrationUserPermissions } from "@homarr/db/schema";

import { constructIntegrationPermissions } from "./integration-permissions";

export const getIntegrationsWithPermissionsAsync = async (session: Session | null) => {
  const groupPermissionWhere = session
    ? inArray(
        integrationGroupPermissions.groupId,
        db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(eq(groupMembers.userId, session.user.id)),
      )
    : eq(integrationGroupPermissions.groupId, "");
  const integrationRows = await db.query.integrations.findMany({
    columns: {
      id: true,
    },
    with: {
      userPermissions: {
        where: eq(integrationUserPermissions.userId, session?.user.id ?? ""),
      },
      groupPermissions: {
        where: groupPermissionWhere,
      },
    },
  });

  return integrationRows.map(({ id, userPermissions, groupPermissions }) => ({
    id,
    permissions: constructIntegrationPermissions({ userPermissions, groupPermissions }, session),
  }));
};
