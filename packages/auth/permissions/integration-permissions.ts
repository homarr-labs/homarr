import type { Session } from "next-auth";

import type { IntegrationPermission } from "@homarr/definitions";

export interface IntegrationPermissionsProps {
  userPermissions: {
    permission: IntegrationPermission;
  }[];
  groupPermissions: {
    permission: IntegrationPermission;
  }[];
}

export const constructIntegrationPermissions = (integration: IntegrationPermissionsProps, session: Session | null) => {
  const permissions = integration.userPermissions
    .concat(integration.groupPermissions)
    .map(({ permission }) => permission);
  const hasGlobalFullAccess = session?.user.permissions.includes("integration-full-all") ?? false;
  const hasGlobalInteractAccess =
    hasGlobalFullAccess || (session?.user.permissions.includes("integration-interact-all") ?? false);
  const hasGlobalUseAccess =
    hasGlobalInteractAccess || (session?.user.permissions.includes("integration-use-all") ?? false);

  return {
    hasFullAccess: hasGlobalFullAccess || permissions.includes("full"),
    hasInteractAccess: hasGlobalInteractAccess || permissions.includes("full") || permissions.includes("interact"),
    hasUseAccess: hasGlobalUseAccess || permissions.length >= 1,
  };
};
