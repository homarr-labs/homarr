import { TRPCError } from "@trpc/server";

import { getCustomWidgetRequiredSecretKinds } from "@homarr/custom-widgets/core";

export function requiredSecretKinds(authType: string) {
  return getCustomWidgetRequiredSecretKinds(authType as Parameters<typeof getCustomWidgetRequiredSecretKinds>[0]);
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
