import type { Session } from "@homarr/auth";

import { api } from "@homarr/api/server";
import { getAppManagementAccess, getIntegrationManagementAccess } from "@homarr/definitions";

/**
 * Session-aware wrappers around the shared management access rules in `@homarr/definitions`, so the
 * navigation and the pages resolve access exactly the same way the API does.
 */

export const getAppsSectionAccess = (session: Session | null) =>
  getAppManagementAccess(session?.user.permissions ?? []);

/**
 * Pure variant for callers that already fetched the integrations the user can see, so the list is
 * only queried once per request.
 */
export const getIntegrationsSectionAccess = (
  session: Session | null,
  visibleIntegrations: { permissions: { hasFullAccess: boolean } }[],
) =>
  getIntegrationManagementAccess(
    session?.user.permissions ?? [],
    visibleIntegrations.some((integration) => integration.permissions.hasFullAccess),
  );

export const getIntegrationsSectionAccessAsync = async (session: Session | null) => {
  const permissions = session?.user.permissions ?? [];

  // Only pay for the lookup when the answer is not already known from the global permissions.
  const needsDelegatedLookup =
    session !== null && !permissions.includes("integration-full-all") && !permissions.includes("integration-create");

  return getIntegrationsSectionAccess(session, needsDelegatedLookup ? await api.integration.all() : []);
};
