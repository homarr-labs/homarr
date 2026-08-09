import type { UIMessage } from "ai";

const inlineAttachmentUrlPattern = /^data:[^,]+;base64,/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFilePart = (value: unknown): value is Record<string, unknown> & { type: "file" } =>
  isRecord(value) && value.type === "file";

const isUIMessage = (value: unknown): value is UIMessage =>
  isRecord(value) &&
  typeof value.id === "string" &&
  (value.role === "user" || value.role === "assistant" || value.role === "system") &&
  Array.isArray(value.parts);

const replaceControlCharacters = (value: string) =>
  [...value]
    .map((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f) ? " " : character;
    })
    .join("");

const getAttachmentMetadataPart = (part: Record<string, unknown>) => {
  const filename =
    typeof part.filename === "string" && part.filename.trim().length > 0
      ? replaceControlCharacters(part.filename).trim().slice(0, 160)
      : "attachment";
  const mediaType = typeof part.mediaType === "string" ? part.mediaType.slice(0, 100) : "application/octet-stream";

  return {
    type: "text" as const,
    text: `[Historical attachment; binary omitted after its original turn: ${JSON.stringify({ filename, mediaType })}]`,
  };
};

/**
 * Keep inline bytes only for the most recent user message. The provider receives those bytes on
 * the attachment's original turn; replaying every prior data URL on later turns wastes the route's
 * bounded request budget and can make two otherwise valid five-image turns fail with HTTP 413.
 */
export const prepareAssistantMessagesForTransport = <TMessage extends UIMessage>(
  messages: readonly TMessage[],
): TMessage[] => {
  const currentAttachmentMessageIndex = messages.findLastIndex((message) => message.role === "user");

  return messages.map((message, messageIndex) => {
    let changed = false;
    const parts: UIMessage["parts"] = [];
    for (const part of message.parts) {
      if (!isFilePart(part)) {
        parts.push(part);
        continue;
      }
      const url = typeof part.url === "string" ? part.url : "";
      if (!inlineAttachmentUrlPattern.test(url) || messageIndex === currentAttachmentMessageIndex) {
        parts.push(part);
        continue;
      }

      changed = true;
      parts.push(getAttachmentMetadataPart(part));
    }

    return changed ? ({ ...message, parts } as TMessage) : message;
  });
};

/**
 * AssistantChatTransport has already initialized the remote thread id when its fetch middleware is
 * called. Prune the serialized envelope here so changing the message body cannot accidentally
 * replace that remote id with assistant-ui's pre-initialization local id.
 */
export const prepareAssistantRequestBody = (body: BodyInit | null | undefined): BodyInit | null | undefined => {
  if (typeof body !== "string") return body;

  try {
    const parsed = JSON.parse(body) as unknown;
    if (!isRecord(parsed) || !Array.isArray(parsed.messages)) return body;
    if (!parsed.messages.every(isUIMessage)) return body;
    return JSON.stringify({ ...parsed, messages: prepareAssistantMessagesForTransport(parsed.messages) });
  } catch {
    return body;
  }
};
