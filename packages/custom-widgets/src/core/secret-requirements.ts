import { getCustomWidgetSourceAuthType } from "./request-schema";
import type { CustomWidgetHttpSource, CustomWidgetSource } from "./request-schema";
import { getCustomWidgetHeaderSecretKind } from "./schema-types";
import type { CustomWidgetAuthType, CustomWidgetSecretKind } from "./schema-types";

export interface CustomWidgetSecretRequirement {
  sourceId: string;
  sourceName: string;
  authType: CustomWidgetAuthType;
  kind: CustomWidgetSecretKind;
  destination?: string;
}

export function getCustomWidgetRequiredSecretKinds(
  auth: CustomWidgetHttpSource["auth"] | Exclude<CustomWidgetAuthType, "headers"> | undefined,
): readonly CustomWidgetSecretKind[] {
  if (typeof auth === "object" && auth.type === "headers") {
    return auth.headers.map(({ slot }) => getCustomWidgetHeaderSecretKind(slot));
  }
  const authType = typeof auth === "object" ? auth.type : auth;
  if (authType === "basic") return ["username", "password"] as const;
  if (authType && ["bearer", "apiKeyHeader", "apiKeyQuery"].includes(authType)) return ["apiKey"] as const;
  return [] as const;
}

export function getCustomWidgetSecretRequirements(
  sources: Record<string, CustomWidgetSource>,
): CustomWidgetSecretRequirement[] {
  return Object.entries(sources).flatMap(([sourceId, source]) => {
    const authType = getCustomWidgetSourceAuthType(source);
    if (typeof source.auth === "object" && source.auth.type === "headers") {
      return source.auth.headers.map(({ name, slot }) => ({
        sourceId,
        sourceName: source.name ?? sourceId,
        authType,
        kind: getCustomWidgetHeaderSecretKind(slot),
        destination: name,
      }));
    }
    let destination: string | undefined;
    if (typeof source.auth === "object" && "name" in source.auth) destination = source.auth.name;
    return getCustomWidgetRequiredSecretKinds(source.auth).map((kind) => ({
      sourceId,
      sourceName: source.name ?? sourceId,
      authType,
      kind,
      destination,
    }));
  });
}
