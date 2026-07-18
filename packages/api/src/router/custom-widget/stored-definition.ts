import { parse as parseSuperJson, stringify as stringifySuperJson } from "superjson";

import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import type { CustomWidgetDefinition } from "@homarr/db/schema";

export function serializeCustomWidgetDefinition(definition: HomarrCustomWidgetV2) {
  return {
    name: definition.name,
    description: definition.description ?? null,
    iconUrl: definition.iconUrl ?? null,
    sources: stringifySuperJson(definition.sources),
    requests: stringifySuperJson(definition.requests),
    optionsSchema: stringifySuperJson(definition.optionsSchema),
    defaultOptions: stringifySuperJson(definition.defaultOptions),
    stateSchema: definition.stateSchema ? stringifySuperJson(definition.stateSchema) : null,
    defaultState: definition.defaultState ? stringifySuperJson(definition.defaultState) : null,
    template: definition.template,
  };
}

export function parseStoredCustomWidgetDefinition(
  definition: Pick<
    CustomWidgetDefinition,
    | "name"
    | "description"
    | "iconUrl"
    | "sources"
    | "requests"
    | "optionsSchema"
    | "defaultOptions"
    | "stateSchema"
    | "defaultState"
    | "template"
  >,
): HomarrCustomWidgetV2 {
  return customWidgetDefinitionSchema.parse({
    $schema: "homarr-custom-widget-v2",
    name: definition.name,
    description: definition.description ?? undefined,
    iconUrl: definition.iconUrl ?? undefined,
    sources: parseSuperJson(definition.sources),
    requests: parseSuperJson(definition.requests),
    optionsSchema: parseSuperJson(definition.optionsSchema),
    defaultOptions: parseSuperJson(definition.defaultOptions),
    stateSchema: definition.stateSchema ? parseSuperJson(definition.stateSchema) : undefined,
    defaultState: definition.defaultState ? parseSuperJson(definition.defaultState) : undefined,
    template: definition.template,
  });
}
