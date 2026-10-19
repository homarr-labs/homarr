import { TRPCError } from "@trpc/server";

import {
  getCustomWidgetRequiredSecretKinds,
  hasSameCustomWidgetSourceAuthentication,
  customWidgetSecretInputSchema,
  isCustomWidgetHeaderSecretKind,
} from "@homarr/custom-widgets/core";
import type { CustomWidgetSource, CustomWidgetSecretKind } from "@homarr/custom-widgets/core";

export function requiredSecretKinds(auth: Parameters<typeof getCustomWidgetRequiredSecretKinds>[0]) {
  return getCustomWidgetRequiredSecretKinds(auth);
}

/**
 * Credentials may only survive edits that preserve their complete security
 * boundary. The path is intentionally excluded: credentials are scoped to an
 * origin, while the network scope and auth destination are part of the binding.
 */
export function hasSameSecretBinding(left: CustomWidgetSource, right: CustomWidgetSource) {
  if (left.type === "integration" || right.type === "integration") return false;
  return (
    new URL(left.baseUrl).origin === new URL(right.baseUrl).origin &&
    left.networkScope === right.networkScope &&
    hasSameCustomWidgetSourceAuthentication(left, right)
  );
}

export function assertSecretSources(
  sources: Record<string, CustomWidgetSource>,
  secrets: readonly { sourceId: string; kind: CustomWidgetSecretKind; value?: string }[],
) {
  const headerIdentities = new Set<string>();
  const invalid = secrets.find((secret) => {
    const source = sources[secret.sourceId];
    if (!source || !new Set<string>(requiredSecretKinds(source.auth)).has(secret.kind)) return true;
    if (!isCustomWidgetHeaderSecretKind(secret.kind)) return false;
    const identity = `${secret.sourceId}:${secret.kind}`;
    if (headerIdentities.has(identity) || !customWidgetSecretInputSchema.safeParse(secret).success) return true;
    headerIdentities.add(identity);
    return false;
  });
  if (invalid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Secret does not match source '${invalid.sourceId}' authentication`,
    });
  }
}
