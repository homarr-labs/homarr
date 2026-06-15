import type { SupportedAuthProvider } from "@homarr/definitions";
import { supportedAuthProviders } from "@homarr/definitions";

import { env } from "../env";

export type GroupMemberManagementType = "local" | "mixed" | "external";

export const isProviderEnabled = (provider: SupportedAuthProvider) => {
  // The question mark is placed there because isProviderEnabled is called during static build of about page
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return env.AUTH_PROVIDERS?.includes(provider);
};

/**
 * Whether a single provider's group memberships are managed locally (manually via UI/API).
 * True for credentials users, and for oidc users when AUTH_OIDC_GROUPS_LOCAL_MANAGEMENT is enabled.
 */
export const isGroupMembershipManagedLocally = (provider: SupportedAuthProvider): boolean => {
  switch (provider) {
    case "credentials":
      return true;
    case "oidc":
      return env.AUTH_OIDC_GROUPS_LOCAL_MANAGEMENT;
    default:
      // ldap + any provider added later: externally managed (synced, not editable
      // here) until explicitly given a case above. New providers safe-by-default.
      return false;
  }
};

export const getEnabledProviders = (): SupportedAuthProvider[] => supportedAuthProviders.filter(isProviderEnabled);

/**
 * The enabled providers whose group memberships can be managed locally.
 */
export const getLocallyManageableProviders = (): SupportedAuthProvider[] =>
  getEnabledProviders().filter(isGroupMembershipManagedLocally);

/**
 * Classifies group-member management across all enabled providers:
 * - "local": every enabled provider is managed locally (no member is synced externally)
 * - "external": no enabled provider is managed locally (every member is synced externally)
 * - "mixed": some are managed locally, some externally (only a subset of members is editable here)
 */
export const getGroupMemberManagementType = (): GroupMemberManagementType => {
  const enabled = getEnabledProviders();
  const manageable = enabled.filter(isGroupMembershipManagedLocally);

  if (manageable.length === enabled.length) return "local";
  if (manageable.length === 0) return "external";
  return "mixed";
};

/**
 * Whether group memberships can be managed locally for at least one enabled provider.
 */
export const canManageGroupMembersLocally = (): boolean => getLocallyManageableProviders().length > 0;
