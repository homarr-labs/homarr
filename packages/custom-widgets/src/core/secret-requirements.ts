import type { CustomWidgetSource } from "./request-schema";
import type { CustomWidgetSecretKind } from "./schema-types";

type AuthType = "none" | "bearer" | "basic" | "apiKeyHeader" | "apiKeyQuery";

export interface CustomWidgetSecretRequirement {
  sourceId: string;
  sourceName: string;
  authType: AuthType;
  kind: CustomWidgetSecretKind;
  destination?: string;
}

export function getCustomWidgetRequiredSecretKinds(authType: AuthType) {
  if (authType === "basic") return ["username", "password"] as const;
  if (["bearer", "apiKeyHeader", "apiKeyQuery"].includes(authType)) return ["apiKey"] as const;
  return [] as const;
}

export function getCustomWidgetSecretRequirements(
  sources: Record<string, CustomWidgetSource>,
): CustomWidgetSecretRequirement[] {
  return Object.entries(sources).flatMap(([sourceId, source]) => {
    const authType = typeof source.auth === "string" ? source.auth : source.auth.type;
    return getCustomWidgetRequiredSecretKinds(authType).map((kind) => ({
      sourceId,
      sourceName: source.name ?? sourceId,
      authType,
      kind,
      destination: typeof source.auth === "object" ? source.auth.name : undefined,
    }));
  });
}
