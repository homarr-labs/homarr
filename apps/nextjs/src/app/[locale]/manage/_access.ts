import type { Session } from "@homarr/auth";

import { api } from "@homarr/api/server";

/**
 * Access rules for the management sections, shared by the navigation and the pages themselves so
 * the two can never drift apart. The rule is always the same: a section is reachable when the user
 * can do at least one thing in it, and the section only ever lists what the user is allowed to see.
 */

export interface AppsSectionAccess {
  /** May see and edit every app */
  canManageAll: boolean;
  /** May add new apps */
  canCreate: boolean;
  /** May delete apps */
  canDelete: boolean;
  /** May open /manage/apps at all */
  canAccess: boolean;
}

export const getAppsSectionAccess = (session: Session | null): AppsSectionAccess => {
  const permissions = session?.user.permissions ?? [];
  const canManageAll = permissions.includes("app-modify-all");
  const canCreate = permissions.includes("app-create");

  return {
    canManageAll,
    canCreate,
    canDelete: permissions.includes("app-full-all"),
    canAccess: canManageAll || canCreate,
  };
};

export interface IntegrationsSectionAccess {
  /** May manage every integration */
  canManageAll: boolean;
  /** May add new integrations */
  canCreate: boolean;
  /** May manage at least one specific integration through a delegated grant */
  hasDelegatedAccess: boolean;
  /** May open /manage/integrations at all */
  canAccess: boolean;
}

/**
 * Pure variant for callers that already fetched the integrations the user can see, so the page and
 * the navigation never disagree and the list is only queried once per request.
 */
export const getIntegrationsSectionAccess = (
  session: Session | null,
  visibleIntegrations: { permissions: { hasFullAccess: boolean } }[],
): IntegrationsSectionAccess => {
  const permissions = session?.user.permissions ?? [];
  const canManageAll = permissions.includes("integration-full-all");
  const canCreate = permissions.includes("integration-create");
  const hasDelegatedAccess =
    !canManageAll && visibleIntegrations.some((integration) => integration.permissions.hasFullAccess);

  return {
    canManageAll,
    canCreate,
    hasDelegatedAccess,
    canAccess: canManageAll || canCreate || hasDelegatedAccess,
  };
};

export const getIntegrationsSectionAccessAsync = async (
  session: Session | null,
): Promise<IntegrationsSectionAccess> => {
  const permissions = session?.user.permissions ?? [];

  // Only pay for the lookup when the answer is not already known from the global permissions.
  const needsDelegatedLookup =
    session !== null && !permissions.includes("integration-full-all") && !permissions.includes("integration-create");

  return getIntegrationsSectionAccess(session, needsDelegatedLookup ? await api.integration.all() : []);
};
