import { jsonSchema } from "ai";
import { z } from "zod/v4";

import { isRecord } from "@homarr/common";

const compactTemplateToolNames = new Set(["customWidget_validateTemplate", "customWidget_previewReviseTemplate"]);
const hiddenAssistantToolInputProperties: Readonly<Record<string, ReadonlySet<string>>> = {
  customWidget_previewCreate: new Set(["secrets"]),
};

const asRecord = (value: unknown): Record<string, unknown> | null => (isRecord(value) ? value : null);

export const getAssistantToolInputSchema = (toolName: string, inputSchema: Record<string, unknown>) => {
  const properties = asRecord(inputSchema.properties);
  if (!properties) return inputSchema;

  const omittedProperties = new Set(
    [...(hiddenAssistantToolInputProperties[toolName] ?? [])].filter((name) => name in properties),
  );
  if (compactTemplateToolNames.has(toolName) && properties.templateLines) {
    omittedProperties.add("template");
    if (toolName === "customWidget_previewReviseTemplate") omittedProperties.add("expectedRevision");
  }
  if (omittedProperties.size === 0) return inputSchema;

  const required = Array.isArray(inputSchema.required)
    ? inputSchema.required.filter((name): name is string => typeof name === "string" && !omittedProperties.has(name))
    : [];
  return {
    ...inputSchema,
    properties: Object.fromEntries(Object.entries(properties).filter(([name]) => !omittedProperties.has(name))),
    required: compactTemplateToolNames.has(toolName) ? [...new Set([...required, "templateLines"])] : required,
  };
};

export const getValidatedAssistantToolSchema = (parameters: z.core.$ZodType) =>
  jsonSchema<unknown>(z.toJSONSchema(parameters) as Parameters<typeof jsonSchema>[0], {
    validate: (value) => {
      const parsed = z.safeParse(parameters, value);
      return parsed.success ? { success: true, value: parsed.data } : { success: false, error: parsed.error };
    },
  });
