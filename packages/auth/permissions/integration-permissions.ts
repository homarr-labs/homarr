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
  return {
    hasFullAccess: session?.user.permissions.includes("integration-full-all"),
    hasInteractAccess:
      integration.userPermissions.some(({ permission }) => permission === "interact") ||
      integration.groupPermissions.some(({ permission }) => permission === "interact") ||
      session?.user.permissions.includes("integration-interact-all"),
    hasUseAccess:
      integration.userPermissions.length >= 1 ||
      integration.groupPermissions.length >= 1 ||
      session?.user.permissions.includes("integration-use-all"),
  };
};
