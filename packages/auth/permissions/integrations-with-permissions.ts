import type { Session } from "../types";

import { db, eq, inArray } from "@homarr/db";
import { groupMembers, integrationGroupPermissions, integrationUserPermissions } from "@homarr/db/schema";

import { constructIntegrationPermissions } from "./integration-permissions";
import { intersectFederationPermissions } from "./federation-permissions";

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
      origin: {
        columns: { remoteIntegrationId: true },
        with: { connection: { columns: { id: true, enabled: true, encryptedConfiguration: true } } },
      },
      userPermissions: {
        where: eq(integrationUserPermissions.userId, session?.user.id ?? ""),
      },
      groupPermissions: {
        where: groupPermissionWhere,
      },
    },
  });

  return integrationRows.map(({ id, userPermissions, groupPermissions, origin }) => ({
    id,
    permissions: intersectFederationPermissions(
      constructIntegrationPermissions({ userPermissions, groupPermissions }, session),
      origin,
    ),
  }));
};
