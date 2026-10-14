import {
  enforceMutationMode,
  hasGlobalPermission,
  requireAuthenticated,
  requireGlobalPermission,
  resolveEffectivePermissions,
  snapshotPolicyIdentity,
} from "../identity";
import type { AuthorizationDecision, PermissionDefinitions, PolicyIdentity } from "../identity";

import type { MediaDeletionFacts, MediaGroupPermissionFacts, MediaMutationFacts } from "./contracts";

export function snapshotMediaIdentityFromGroupPermissions(
  definitions: PermissionDefinitions,
  facts: MediaGroupPermissionFacts,
): PolicyIdentity {
  return snapshotPolicyIdentity({
    type: "authenticated",
    userId: facts.userId,
    groupIds: facts.groupIds,
    permissions: resolveEffectivePermissions(
      definitions,
      facts.permissions.map(({ permission }) => permission),
    ),
  });
}

export function decideMediaDeletion(
  identity: PolicyIdentity,
  media: MediaDeletionFacts | undefined,
): AuthorizationDecision {
  const authenticated = requireAuthenticated(identity);
  if (authenticated.type === "deny") return authenticated;
  if (!media) return { type: "deny", reason: "not-found" };
  if (
    hasGlobalPermission(identity, "media-full-all") ||
    (identity.type === "authenticated" && identity.userId === media.creatorId)
  )
    return { type: "allow" };
  return { type: "deny", reason: "forbidden" };
}

export function decideMediaMutation(facts: MediaMutationFacts): AuthorizationDecision {
  const mode = enforceMutationMode(facts.mode, "mutation");
  if (mode.type === "deny") return mode;
  return facts.action === "upload"
    ? requireGlobalPermission(facts.identity, "media-upload")
    : decideMediaDeletion(facts.identity, facts.media);
}
