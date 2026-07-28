import type { legacyCustomWidgetDefinitions } from "@homarr/db/schema";
import { buildCustomWidgetAiPrompt } from "@homarr/custom-widgets/authoring-prompt";

type LegacyCustomWidgetDefinition = typeof legacyCustomWidgetDefinitions.$inferSelect;

export function buildLegacyCustomWidgetMigrationPrompt(
  definition: LegacyCustomWidgetDefinition,
  configuredSecretKinds: readonly string[],
) {
  const legacyDefinition = {
    $schema: "homarr-custom-widget-v1",
    name: definition.name,
    description: definition.description,
    iconUrl: definition.iconUrl ? redactLegacyUrl(definition.iconUrl) : null,
    url: redactLegacyUrl(definition.url),
    authType: definition.authType,
    headerName: definition.headerName,
    method: definition.method,
    requestBody: redactLegacyRequestBody(definition.requestBody),
    displayType: definition.displayType,
    displayConfig: {
      migrationNote:
        "The preserved v1 display configuration was intentionally omitted because legacy free-text fields may contain credentials. Reconstruct it from the display type and visible behavior.",
    },
    configuredSecretKinds,
  };
  return buildCustomWidgetAiPrompt(
    undefined,
    undefined,
    legacyDefinition,
    [
      "Migrate this preserved Homarr v1 Custom Widget to Custom JSX v2.",
      "Preserve its visible behavior and API intent, use a source named default, and return importable v2 JSON plus JSX.",
      "The URL and request-body values may be redacted; keep placeholders and never invent or include credentials.",
      "Credential kinds are informational only and must be configured separately in Homarr.",
    ].join(" "),
  );
}

function redactLegacyUrl(value: string) {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.hash = "";
    url.pathname = url.pathname
      .split("/")
      .map((segment) => (segment ? "[REDACTED]" : segment))
      .join("/");
    for (const key of url.searchParams.keys()) url.searchParams.set(key, "[REDACTED]");
    return url.toString();
  } catch {
    return "[INVALID LEGACY URL — enter the API URL in Homarr]";
  }
}

function redactLegacyRequestBody(value: string | null) {
  if (!value) return value;
  try {
    return JSON.stringify(redactAllValues(JSON.parse(value) as unknown));
  } catch {
    return "[REDACTED LEGACY REQUEST BODY]";
  }
}

function redactAllValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAllValues);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, redactAllValues(child)]));
  if (value === null) return null;
  return "[REDACTED VALUE]";
}
