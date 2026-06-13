import type { SupportedAuthProvider } from "@homarr/definitions";

import { env } from "../env";

export const isProviderEnabled = (provider: SupportedAuthProvider) => {
  // The question mark is placed there because isProviderEnabled is called during static build of about page
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return env.AUTH_PROVIDERS?.includes(provider);
};

/**
 * Whether group memberships can be managed locally (manually via UI/API).
 * True for credentials users, and for oidc users when AUTH_OIDC_GROUPS_LOCAL_MANAGEMENT is enabled.
 */
export const canManageGroupMembersLocally = () => {
  return isProviderEnabled("credentials") || (isProviderEnabled("oidc") && env.AUTH_OIDC_GROUPS_LOCAL_MANAGEMENT);
};
