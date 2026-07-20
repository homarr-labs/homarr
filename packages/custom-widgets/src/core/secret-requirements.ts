import type { CustomWidgetSource } from "./request-schema";
import type { CustomWidgetSecretKind } from "./schema-types";

export interface CustomWidgetSecretRequirement {
  sourceId: string;
  sourceName: string;
  authType: CustomWidgetSource["auth"]["type"];
  kind: CustomWidgetSecretKind;
  destination?: string;
}

export function getCustomWidgetRequiredSecretKinds(authType: CustomWidgetSource["auth"]["type"]) {
  if (authType === "basic") return ["username", "password"] as const;
  if (authType === "bearer" || authType === "apiKeyHeader" || authType === "apiKeyQuery") {
    return ["apiKey"] as const;
  }
  return [] as const;
}

export function getCustomWidgetSecretRequirements(
  sources: readonly CustomWidgetSource[],
): CustomWidgetSecretRequirement[] {
  return sources.flatMap((source) =>
    getCustomWidgetRequiredSecretKinds(source.auth.type).map((kind) => ({
      sourceId: source.id,
      sourceName: source.name,
      authType: source.auth.type,
      kind,
      destination:
        source.auth.type === "apiKeyHeader"
          ? source.auth.headerName
          : source.auth.type === "apiKeyQuery"
            ? source.auth.parameterName
            : undefined,
    })),
  );
}
