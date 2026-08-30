import { serialize } from "superjson";

export const customWidgetPreviewQueryOutputMaxCharacters = 8_000;
export const assistantToolOutputMaxCharacters = 24_000;
const customWidgetAuthoringResourceOutputMaxCharacters = 60_000;

const customWidgetAuthoringResourceToolNames = new Set([
  "customWidget_schema",
  "customWidget_getSkill",
  "customWidget_getReference",
  "customWidget_getComponentCatalog",
  "customWidget_getComponent",
  "customWidget_getComponents",
  "customWidget_getSharedProps",
  "customWidget_getExample",
]);

export const getAssistantToolOutputMaxCharacters = (toolName: string) => {
  if (toolName === "customWidget_previewQuery") return customWidgetPreviewQueryOutputMaxCharacters;
  if (customWidgetAuthoringResourceToolNames.has(toolName)) return customWidgetAuthoringResourceOutputMaxCharacters;
  return assistantToolOutputMaxCharacters;
};

type AssistantToolOutputOptions = {
  maxCharacters?: number;
};

/**
 * AI SDK model messages only accept JSON-compatible tool results. Homarr's tRPC callers can
 * return richer values such as Date, bigint, Map, Set, NaN, and nested undefined values.
 * SuperJSON's transport representation normalizes those values without restoring their runtime
 * types, keeping subsequent agent steps valid while preserving the useful data.
 */
export const toAssistantToolOutput = (value: unknown, options: AssistantToolOutputOptions = {}) => {
  const output = serialize(value as Parameters<typeof serialize>[0]).json;
  if (options.maxCharacters === undefined) return output;

  const serialized = JSON.stringify(output);
  if (serialized === undefined || serialized.length <= options.maxCharacters) return output;

  const outputRecord =
    typeof output === "object" && output !== null && !Array.isArray(output)
      ? (output as Record<string, unknown>)
      : undefined;
  const metadata = outputRecord
    ? Object.fromEntries(
        ["ok", "status", "statusText", "error"].flatMap((key) =>
          outputRecord[key] === undefined ? [] : [[key, outputRecord[key]]],
        ),
      )
    : {};
  const createPreview = (previewCharacters: number) => ({
    ...metadata,
    truncated: true as const,
    originalCharacters: serialized.length,
    preview: serialized.slice(0, previewCharacters),
    note: "The tool result was truncated to protect the conversation context. Use a narrower search or more specific tool when more detail is needed.",
  });
  let lowerBound = 0;
  let upperBound = serialized.length;
  while (lowerBound < upperBound) {
    const candidate = Math.ceil((lowerBound + upperBound) / 2);
    if (JSON.stringify(createPreview(candidate)).length <= options.maxCharacters) lowerBound = candidate;
    else upperBound = candidate - 1;
  }
  return createPreview(lowerBound);
};
