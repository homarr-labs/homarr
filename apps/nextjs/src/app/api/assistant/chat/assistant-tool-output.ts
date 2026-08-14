import { serialize } from "superjson";

export const customWidgetPreviewQueryOutputMaxCharacters = 8_000;

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
    note: "The preview query response was truncated to protect the conversation context. The preview contains the beginning of the real response for shape and binding verification.",
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
