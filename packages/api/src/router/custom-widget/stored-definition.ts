import { parse as parseSuperJson, stringify as stringifySuperJson } from "superjson";

import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import type { CustomWidgetDefinition } from "@homarr/db/schema";

type StoredCustomWidgetDefinition = Pick<
  CustomWidgetDefinition,
  "name" | "description" | "iconUrl" | "sources" | "requests" | "optionsSchema" | "defaultOptions" | "template"
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
    optionsSchema: stringifySuperJson(definition.optionsSchema),
    defaultOptions: stringifySuperJson(definition.defaultOptions),
    template: definition.template,
  };
}

export function parseStoredCustomWidgetDefinition(definition: StoredCustomWidgetDefinition): HomarrCustomWidgetV2 {
  return customWidgetDefinitionSchema.parse({
    $schema: "homarr-custom-widget-v2",
    name: definition.name,
    description: definition.description ?? undefined,
    iconUrl: definition.iconUrl ?? undefined,
    sources: parseSuperJson(definition.sources),
    requests: parseSuperJson(definition.requests),
    optionsSchema: parseSuperJson(definition.optionsSchema),
    defaultOptions: parseSuperJson(definition.defaultOptions),
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
