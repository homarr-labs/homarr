import { TRPCError } from "@trpc/server";

export function requiredSecretKinds(authType: string) {
  if (authType === "basic") return ["username", "password"] as const;
  if (authType === "bearer" || authType === "apiKeyHeader" || authType === "apiKeyQuery") {
    return ["apiKey"] as const;
  }
  return [] as const;
}

export function assertSecretSources(
  sources: readonly { id: string; auth: { type: string } }[],
  secrets: readonly { sourceId: string; kind: "apiKey" | "username" | "password" }[],
) {
  const invalid = secrets.find((secret) => {
    const source = sources.find((candidate) => candidate.id === secret.sourceId);
    return !source || !new Set<string>(requiredSecretKinds(source.auth.type)).has(secret.kind);
  });
  if (invalid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Secret does not match source '${invalid.sourceId}' authentication`,
    });
  }
}
