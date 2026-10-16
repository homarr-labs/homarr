import { decryptSecret } from "@homarr/common/server";

interface Permissions {
  hasUseAccess: boolean;
  hasInteractAccess: boolean;
  hasFullAccess: boolean;
}
export interface IntegrationOriginAccess {
  remoteIntegrationId: string;
  connection: { id: string; enabled: boolean; encryptedConfiguration: string };
}
export interface VerifiedFederationAuthorization {
  integrationIds: string[];
  access: "query" | "interact" | "full";
  expiresAt: number;
}
const unavailable = new Set<string>();
const denied: Permissions = { hasUseAccess: false, hasInteractAccess: false, hasFullAccess: false };

export function markFederationUnavailable(connectionId: string, failed: boolean) {
  if (!failed) {
    unavailable.delete(connectionId);
    return;
  }
  if (unavailable.size >= 1024) {
    const oldest = unavailable.values().next().value;
    if (oldest) unavailable.delete(oldest);
  }
  unavailable.add(connectionId);
}

/** Persisted metadata is written only after the source's encrypted device authorization succeeds. */
export function getVerifiedFederationAuthorization(
  origin: IntegrationOriginAccess,
): VerifiedFederationAuthorization | null {
  if (!origin.connection.enabled) return null;
  try {
    const configuration = JSON.parse(
      decryptSecret(origin.connection.encryptedConfiguration as `${string}.${string}`),
    ) as { verifiedAuthorization?: VerifiedFederationAuthorization };
    const authorization = configuration.verifiedAuthorization;
    if (
      !authorization ||
      !["query", "interact", "full"].includes(authorization.access) ||
      !Array.isArray(authorization.integrationIds) ||
      !authorization.integrationIds.includes(origin.remoteIntegrationId) ||
      !Number.isSafeInteger(authorization.expiresAt) ||
      authorization.expiresAt <= Date.now()
    )
      return null;
    return authorization;
  } catch {
    return null;
  }
}

export function intersectFederationPermissions(
  permissions: Permissions,
  origin: IntegrationOriginAccess | null,
  ignoreUnavailable = false,
): Permissions {
  if (!origin) return permissions;
  const authorization = getVerifiedFederationAuthorization(origin);
  if (!authorization || (!ignoreUnavailable && unavailable.has(origin.connection.id))) return { ...denied };
  return {
    hasUseAccess: permissions.hasUseAccess,
    hasInteractAccess: permissions.hasInteractAccess && authorization.access !== "query",
    hasFullAccess: permissions.hasFullAccess && authorization.access === "full",
  };
}
