const compactTemplateToolNames = new Set(["customWidget_validateTemplate", "customWidget_previewReviseTemplate"]);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

export const getAssistantToolInputSchema = (toolName: string, inputSchema: Record<string, unknown>) => {
  if (!compactTemplateToolNames.has(toolName)) return inputSchema;
  const properties = asRecord(inputSchema.properties);
  if (!properties?.templateLines) return inputSchema;

  const omittedProperties = new Set(["template"]);
  if (toolName === "customWidget_previewReviseTemplate") omittedProperties.add("expectedRevision");

  const required = Array.isArray(inputSchema.required)
    ? inputSchema.required.filter((name): name is string => typeof name === "string" && !omittedProperties.has(name))
    : [];
  return {
    ...inputSchema,
    properties: Object.fromEntries(Object.entries(properties).filter(([name]) => !omittedProperties.has(name))),
    required: [...new Set([...required, "templateLines"])],
  };
};
