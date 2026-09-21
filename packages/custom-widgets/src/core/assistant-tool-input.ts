const previewSessionAliases = ["previewSessionId", "previewId", "previewSession"] as const;

const withCanonicalReferenceName = (input: Record<string, unknown>) => {
  if (typeof input.name !== "string") return input;
  const name = input.name.trim().toLowerCase();
  if (name === input.name) return input;
  return { ...input, name };
};

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
  if (!input.templateLines.every((line) => typeof line === "string")) return input;
  if (input.template !== "" && input.template !== input.templateLines.join("\n")) return input;
  const normalized = { ...input };
  delete normalized.template;
  return normalized;
};

const scalarSourceAuthTypes = new Set(["none", "bearer", "basic"]);

const withCanonicalSourceAuth = (definition: Record<string, unknown>) => {
  if (typeof definition.sources !== "object" || definition.sources === null || Array.isArray(definition.sources)) {
    return definition;
  }

  let changed = false;
  const sources = Object.fromEntries(
    Object.entries(definition.sources).map(([sourceName, source]) => {
      if (typeof source !== "object" || source === null || Array.isArray(source)) return [sourceName, source];

      const auth = (source as Record<string, unknown>).auth;
      if (typeof auth !== "object" || auth === null || Array.isArray(auth)) return [sourceName, source];
      const authKeys = Object.keys(auth);
      const type = (auth as Record<string, unknown>).type;
      if (authKeys.length !== 1 || authKeys[0] !== "type" || typeof type !== "string") return [sourceName, source];
      if (!scalarSourceAuthTypes.has(type)) return [sourceName, source];

      changed = true;
      return [sourceName, { ...source, auth: type }];
    }),
  );

  return changed ? { ...definition, sources } : definition;
};

const withoutRedundantOptionNames = (definition: Record<string, unknown>) => {
  if (typeof definition.options !== "object" || definition.options === null || Array.isArray(definition.options)) {
    return definition;
  }

  let changed = false;
  const options = Object.fromEntries(
    Object.entries(definition.options).map(([optionName, option]) => {
      if (typeof option !== "object" || option === null || Array.isArray(option)) return [optionName, option];
      if ((option as Record<string, unknown>).name !== optionName) return [optionName, option];

      const normalizedOption = { ...option };
      delete normalizedOption.name;
      changed = true;
      return [optionName, normalizedOption];
    }),
  );

  return changed ? { ...definition, options } : definition;
};

const withCanonicalPreviewDefinition = (input: Record<string, unknown>) => {
  input = withParsedPreviewDefinition(input);
  if (typeof input.definition !== "object" || input.definition === null || Array.isArray(input.definition))
    return input;

  let definition = input.definition as Record<string, unknown>;
  definition = withCanonicalTemplateLines(definition);
  definition = withCanonicalSourceAuth(definition);
  definition = withoutRedundantOptionNames(definition);
  return definition === input.definition ? input : { ...input, definition };
};

export function normalizeCustomWidgetLifecycleToolInput(
  toolName: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  if (toolName === "customWidget_getReference") {
    return withCanonicalReferenceName(input);
  }
  if (toolName === "customWidget_validateTemplate" || toolName === "customWidget_previewReviseTemplate") {
    input = withCanonicalTemplateLines(input);
  }
  if (toolName === "customWidget_previewCreate") {
    return withCanonicalPreviewDefinition(input);
  }
  if (
    toolName === "customWidget_previewQuery" ||
    toolName === "customWidget_previewAction" ||
    toolName === "customWidget_previewJournal" ||
    toolName === "customWidget_previewReviseTemplate"
  ) {
    return withCanonicalSessionId(input, "sessionId", previewSessionAliases);
  }
  if (toolName === "customWidget_createFromPreview" || toolName === "customWidget_updateFromPreview") {
    return withCanonicalSessionId(input, "previewSessionId", ["sessionId", "previewId", "previewSession"]);
  }
  return input;
}
