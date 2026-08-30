const previewSessionAliases = ["previewSessionId", "previewId", "previewSession"] as const;

const getSessionAliasValue = (input: Record<string, unknown>, aliases: readonly string[]) => {
  for (const alias of aliases) {
    const value = input[alias];
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const id = (value as Record<string, unknown>).id;
      if (typeof id === "string" && id.length > 0) return id;
    }
  }
  return null;
};

const withCanonicalSessionId = (
  input: Record<string, unknown>,
  canonicalName: "sessionId" | "previewSessionId",
  aliases: readonly string[],
) => {
  if (typeof input[canonicalName] === "string") return input;
  const sessionId = getSessionAliasValue(input, aliases);
  if (!sessionId) return input;

  const normalized = { ...input, [canonicalName]: sessionId };
  for (const alias of aliases) {
    if (alias !== canonicalName) delete normalized[alias];
  }
  return normalized;
};

const withParsedPreviewDefinition = (input: Record<string, unknown>) => {
  if (typeof input.definition !== "string") return input;
  let definition: unknown;
  try {
    definition = JSON.parse(input.definition);
  } catch {
    return input;
  }
  if (typeof definition !== "object" || definition === null || Array.isArray(definition)) return input;
  return { ...input, definition };
};

const withCanonicalTemplateLines = (input: Record<string, unknown>) => {
  if (typeof input.template !== "string" || !Array.isArray(input.templateLines)) return input;
  const normalized = { ...input };
  delete normalized.template;
  return normalized;
};

export function normalizeCustomWidgetLifecycleToolInput(
  toolName: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  if (toolName === "customWidget_validateTemplate" || toolName === "customWidget_previewReviseTemplate") {
    input = withCanonicalTemplateLines(input);
  }
  if (toolName === "customWidget_previewCreate") {
    return withParsedPreviewDefinition(input);
  }
  if (
    toolName === "customWidget_previewQuery" ||
    toolName === "customWidget_previewAction" ||
    toolName === "customWidget_previewJournal" ||
    toolName === "customWidget_previewReviseTemplate"
  ) {
    return withCanonicalSessionId(input, "sessionId", previewSessionAliases);
  }
  if (toolName === "customWidget_createFromPreview") {
    return withCanonicalSessionId(input, "previewSessionId", ["sessionId", "previewId", "previewSession"]);
  }
  return input;
}
