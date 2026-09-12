import { getCustomWidgetSourceAuthType } from "./request-schema";
import type { CustomJsxNetworkScope, CustomWidgetSource } from "./request-schema";
import { getCustomWidgetSourceUrlIssue } from "./request-schema";
import type { CustomWidgetSecretKind } from "./schema-types";
import { getCustomWidgetSecretRequirements } from "./secret-requirements";

export interface CustomWidgetConfiguredSecret {
  sourceId: string;
  kind: CustomWidgetSecretKind;
  hasValue?: boolean;
  value?: string;
}

export interface CustomWidgetSourceSetup {
  sourceId: string;
  sourceName: string;
  suggestedBaseUrl: string;
  baseUrl: string;
  networkScope: CustomJsxNetworkScope;
  integrationKind?: string;
  integrationId?: string;
  authType: "none" | "bearer" | "basic" | "apiKeyHeader" | "apiKeyQuery";
  credentialFields: Array<{
    kind: CustomWidgetSecretKind;
    destination?: string;
    configured: boolean;
  }>;
  requiresUrlConfirmation: boolean;
}

const placeholderHosts = new Set(["example.com", "example.org", "example.net"]);

export function isCustomWidgetSourceUrlPlaceholder(baseUrl: string) {
  if (!URL.canParse(baseUrl)) return false;
  const hostname = new URL(baseUrl).hostname.toLowerCase();
  return (
    placeholderHosts.has(hostname) ||
    hostname.endsWith(".example.com") ||
    hostname.endsWith(".example.org") ||
    hostname.endsWith(".example.net") ||
    /^(?:your-|replace-|change-me)/u.test(hostname)
  );
}

export function customWidgetSourceRequiresUrlConfirmation(source: CustomWidgetSource) {
  if (source.type === "integration") return !source.integrationId;
  return source.networkScope !== "public" || isCustomWidgetSourceUrlPlaceholder(source.baseUrl);
}

export function hasSameCustomWidgetSourceAuthentication(left: CustomWidgetSource, right: CustomWidgetSource) {
  if (left.type === "integration" || right.type === "integration") {
    return (
      left.type === right.type &&
      left.integrationKind === right.integrationKind &&
      left.integrationId === right.integrationId
    );
  }
  if (typeof left.auth === "string" || typeof right.auth === "string") return left.auth === right.auth;
  return left.auth.type === right.auth.type && left.auth.name === right.auth.name;
}

export function getCustomWidgetSourceSetups(
  sources: Record<string, CustomWidgetSource>,
  configuredSecrets: readonly CustomWidgetConfiguredSecret[] = [],
): CustomWidgetSourceSetup[] {
  const requirements = getCustomWidgetSecretRequirements(sources);
  return Object.entries(sources).map(([sourceId, source]) => {
    const authType = getCustomWidgetSourceAuthType(source);
    return {
      sourceId,
      sourceName: source.name ?? sourceId,
      suggestedBaseUrl: source.baseUrl ?? "",
      baseUrl: source.baseUrl ?? "",
      networkScope: source.networkScope ?? "private",
      integrationKind: source.integrationKind,
      integrationId: source.integrationId,
      authType,
      credentialFields: requirements
        .filter((requirement) => requirement.sourceId === sourceId)
        .map((requirement) => ({
          kind: requirement.kind,
          destination: requirement.destination,
          configured: configuredSecrets.some(
            (secret) =>
              secret.sourceId === sourceId &&
              secret.kind === requirement.kind &&
              (secret.hasValue === true || Boolean(secret.value?.trim())),
          ),
        })),
      requiresUrlConfirmation: customWidgetSourceRequiresUrlConfirmation(source),
    };
  });
}

export function applyCustomWidgetSourceSetup(
  sources: Record<string, CustomWidgetSource>,
  setup: Record<string, { baseUrl?: string; networkScope?: CustomJsxNetworkScope; integrationId?: string }>,
) {
  return Object.fromEntries(
    Object.entries(sources).map(([sourceId, source]) => {
      const configured = setup[sourceId];
      if (!configured) return [sourceId, source];
      if (source.type === "integration") {
        return [sourceId, { ...source, integrationId: configured.integrationId }];
      }
      return [
        sourceId,
        {
          ...source,
          baseUrl: configured.baseUrl ?? source.baseUrl,
          networkScope: configured.networkScope ?? source.networkScope,
        },
      ];
    }),
  );
}

export function getCustomWidgetSourceSetupIssue(source: Pick<CustomWidgetSourceSetup, "baseUrl">) {
  return getCustomWidgetSourceUrlIssue(source.baseUrl);
}
