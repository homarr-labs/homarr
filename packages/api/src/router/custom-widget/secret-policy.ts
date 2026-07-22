import { TRPCError } from "@trpc/server";

import {
  getCustomWidgetRequiredSecretKinds,
  hasSameCustomWidgetSourceAuthentication,
} from "@homarr/custom-widgets/core";
import type { CustomWidgetSource } from "@homarr/custom-widgets/core";

export function requiredSecretKinds(authType: string) {
  return getCustomWidgetRequiredSecretKinds(authType as Parameters<typeof getCustomWidgetRequiredSecretKinds>[0]);
}

/**
 * Credentials may only survive edits that preserve their complete security
 * boundary. The path is intentionally excluded: credentials are scoped to an
 * origin, while the network scope and auth destination are part of the binding.
 */
export function hasSameSecretBinding(left: CustomWidgetSource, right: CustomWidgetSource) {
  return (
    new URL(left.baseUrl).origin === new URL(right.baseUrl).origin &&
    left.networkScope === right.networkScope &&
    hasSameCustomWidgetSourceAuthentication(left, right)
  );
}

export function assertSecretSources(
  sources: Record<string, { auth: string | { type: string } }>,
  secrets: readonly { sourceId: string; kind: "apiKey" | "username" | "password" }[],
) {
  const invalid = secrets.find((secret) => {
    const source = sources[secret.sourceId];
    const authType = typeof source?.auth === "string" ? source.auth : source?.auth.type;
    return !source || !authType || !new Set<string>(requiredSecretKinds(authType)).has(secret.kind);
  });
  if (invalid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Secret does not match source '${invalid.sourceId}' authentication`,
    });
  }
}
