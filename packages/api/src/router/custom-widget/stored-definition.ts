import { parse as parseSuperJson, stringify as stringifySuperJson } from "superjson";

import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import type { CustomWidgetDefinition } from "@homarr/db/schema";

type StoredCustomWidgetDefinition = Pick<
  CustomWidgetDefinition,
  "name" | "description" | "iconUrl" | "sources" | "requests" | "options" | "template" | "extensions"
>;

export interface StoredCustomWidgetIssue {
  path?: string;
  message: string;
}

export type StoredCustomWidgetParseResult =
  | { success: true; widget: HomarrCustomWidgetV2 }
  | { success: false; issues: StoredCustomWidgetIssue[] };

export function serializeCustomWidgetDefinition(definition: HomarrCustomWidgetV2) {
  return {
    name: definition.name,
    description: definition.description ?? null,
    iconUrl: definition.iconUrl ?? null,
    sources: stringifySuperJson(definition.sources),
    requests: stringifySuperJson(definition.requests),
    options: stringifySuperJson(definition.options),
    template: definition.template,
    extensions: definition.$schema === "homarr-custom-widget-v3" ? JSON.stringify(definition.extensions ?? {}) : null,
  };
}

export function parseStoredCustomWidgetDefinition(definition: StoredCustomWidgetDefinition): HomarrCustomWidgetV2 {
  return customWidgetDefinitionSchema.parse({
    $schema: definition.extensions != null ? "homarr-custom-widget-v3" : "homarr-custom-widget-v2",
    ...(definition.extensions != null ? { extensions: JSON.parse(definition.extensions) } : {}),
    name: definition.name,
    description: definition.description ?? undefined,
    iconUrl: definition.iconUrl ?? undefined,
    sources: parseSuperJson(definition.sources),
    requests: parseSuperJson(definition.requests),
    options: parseSuperJson(definition.options),
    template: definition.template,
  });
}

export function safeParseStoredCustomWidgetDefinition(
  definition: StoredCustomWidgetDefinition,
): StoredCustomWidgetParseResult {
  try {
    return { success: true, widget: parseStoredCustomWidgetDefinition(definition) };
  } catch (error) {
    if (error instanceof Error && "issues" in error && Array.isArray(error.issues)) {
      return {
        success: false,
        issues: error.issues.slice(0, 10).map((issue: { path?: PropertyKey[]; message?: unknown }) => ({
          path: issue.path?.map(String).join("."),
          message: typeof issue.message === "string" ? issue.message : "Invalid stored widget value",
        })),
      };
    }

    return {
      success: false,
      issues: [{ message: "Stored widget data could not be read" }],
    };
  }
}
