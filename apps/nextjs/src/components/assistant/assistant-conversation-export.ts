export interface AssistantConversationExportMessage {
  id: string;
  parentId: string | null;
  format: string;
  content: unknown;
  createdAt?: Date | string | null;
}

interface AssistantConversationExportInput {
  thread: {
    id: string;
    title?: string | null;
    modelId?: string | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
  };
  messages: AssistantConversationExportMessage[];
  exportedAt?: Date;
}

const sensitiveKeyPattern =
  /(?:api[-_]?key|authorization|cookie|credential|password|private[-_]?key|secret|session[-_]?token|(?:access|auth|refresh|generation)[-_]?token|^token$)$/iu;
const dataUrlPattern = /^data:([^;,]+)[;,]/iu;
const bearerTokenPattern = /\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/giu;
const commonApiKeyPattern = /\bsk-(?:or-v1-)?[A-Za-z0-9_-]{16,}\b/giu;
const maxDebugStringLength = 12_000;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const redactDebugValue = (value: unknown, key?: string): unknown => {
  if (key && sensitiveKeyPattern.test(key)) return "[redacted]";
  if (typeof value === "string") {
    let text = value.replaceAll(bearerTokenPattern, "Bearer [redacted]").replaceAll(commonApiKeyPattern, "[redacted]");
    const dataUrl = dataUrlPattern.exec(text);
    if (dataUrl) return `[${dataUrl[1] ?? "binary"} data omitted]`;
    if (/^https?:\/\//iu.test(text)) {
      try {
        const url = new URL(text);
        if (url.username) url.username = "redacted";
        if (url.password) url.password = "redacted";
        for (const name of url.searchParams.keys()) {
          if (sensitiveKeyPattern.test(name)) url.searchParams.set(name, "redacted");
        }
        text = url.toString();
      } catch {
        // Keep malformed URLs as ordinary bounded debug strings.
      }
    }
    return text.length > maxDebugStringLength
      ? `${text.slice(0, maxDebugStringLength)}\n… [truncated ${text.length - maxDebugStringLength} characters]`
      : text;
  }
  if (Array.isArray(value)) return value.map((entry) => redactDebugValue(entry));
  const record = asRecord(value);
  if (!record) return value;
  return Object.fromEntries(
    Object.entries(record).map(([entryKey, entry]) => [entryKey, redactDebugValue(entry, entryKey)]),
  );
};

const fencedJson = (value: unknown) => {
  const serialized = JSON.stringify(redactDebugValue(value), null, 2) ?? String(redactDebugValue(value));
  return `\n\`\`\`json\n${serialized}\n\`\`\`\n`;
};

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return "Not recorded";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};

const roleLabel = (role: unknown) => {
  switch (role) {
    case "user":
      return "User message";
    case "assistant":
      return "Assistant response";
    case "system":
      return "System message";
    case "tool":
      return "Tool message";
    default:
      return "Server message";
  }
};

const getToolName = (part: Record<string, unknown>) => {
  if (typeof part.toolName === "string") return part.toolName;
  if (typeof part.type !== "string") return null;
  if (part.type === "tool-call") return "unknown tool";
  return part.type.startsWith("tool-") ? part.type.slice("tool-".length) : null;
};

const isToolPart = (part: unknown) => {
  const record = asRecord(part);
  if (!record || typeof record.type !== "string") return false;
  return record.type === "dynamic-tool" || record.type === "tool-call" || record.type.startsWith("tool-");
};

const getToolValue = (part: Record<string, unknown>, primary: string, fallback: string) =>
  primary in part ? part[primary] : part[fallback];

const renderToolPart = (part: Record<string, unknown>) => {
  const toolName = getToolName(part) ?? "unknown tool";
  const input = getToolValue(part, "input", "args");
  const output = getToolValue(part, "output", "result");
  const rawInput = getToolValue(part, "rawInput", "argsText");
  const state =
    typeof part.state === "string"
      ? part.state
      : part.isError === true
        ? "output-error"
        : output !== undefined
          ? "output-available"
          : "input-available";
  const lines = [`### Tool call: \`${toolName}\``, `- State: \`${state}\``];
  if (typeof part.toolCallId === "string") lines.push(`- Call ID: \`${part.toolCallId}\``);
  if (typeof part.providerExecuted === "boolean")
    lines.push(`- Provider executed: ${part.providerExecuted ? "Yes" : "No"}`);
  if (typeof part.preliminary === "boolean") lines.push(`- Preliminary result: ${part.preliminary ? "Yes" : "No"}`);
  if (input !== undefined) lines.push("#### Input", fencedJson(input));
  if (rawInput !== undefined && rawInput !== input) lines.push("#### Raw streamed input", fencedJson(rawInput));
  if (output !== undefined) lines.push("#### Output", fencedJson(output));
  if (typeof part.errorText === "string") lines.push("#### Error", part.errorText);
  else if (part.isError === true) lines.push("#### Error", "The tool result was marked as an error.");
  if (part.approval !== undefined) lines.push("#### Approval", fencedJson(part.approval));

  const diagnostics = Object.fromEntries(
    Object.entries(part).filter(
      ([key]) =>
        ![
          "type",
          "toolName",
          "toolCallId",
          "state",
          "input",
          "args",
          "output",
          "result",
          "rawInput",
          "argsText",
          "errorText",
          "isError",
          "approval",
          "providerExecuted",
          "preliminary",
        ].includes(key),
    ),
  );
  if (Object.keys(diagnostics).length > 0) {
    lines.push("<details>", "<summary>Tool diagnostics</summary>", fencedJson(diagnostics), "</details>");
  }
  return lines.join("\n");
};

const renderSourcePart = (part: Record<string, unknown>) => {
  const title = typeof part.title === "string" ? part.title : "Source";
  if (typeof part.url === "string") return `- [${title}](${part.url})`;
  return `### Source document\n${fencedJson(part)}`;
};

const renderMessagePart = (part: unknown, index: number) => {
  const record = asRecord(part);
  if (!record) return `### Part ${index}\n${fencedJson(part)}`;
  const type = typeof record.type === "string" ? record.type : "unknown";

  if (type === "text" && typeof record.text === "string") return record.text;
  if (type === "reasoning" && typeof record.text === "string") {
    return `<details>\n<summary>Reasoning</summary>\n\n${record.text}\n\n</details>`;
  }
  if (type === "step-start") return "**Agent step started**";
  if (isToolPart(record)) return renderToolPart(record);
  if (type === "source" || type === "source-url" || type === "source-document") return renderSourcePart(record);
  if (type === "file" || type === "image" || type === "audio" || type === "reasoning-file") {
    return `### ${type}\n${fencedJson(record)}`;
  }
  if (type === "data" || type.startsWith("data-") || type === "generative-ui" || type === "custom") {
    return `### ${type}\n${fencedJson(record)}`;
  }
  return `### ${type}\n${fencedJson(record)}`;
};

const getMessagePayload = (message: AssistantConversationExportMessage) => asRecord(message.content);

const getMessageParts = (message: AssistantConversationExportMessage) => {
  const payload = getMessagePayload(message);
  if (Array.isArray(payload?.parts)) return payload.parts;
  return Array.isArray(payload?.content) ? payload.content : [];
};

const getMessageToolCount = (message: AssistantConversationExportMessage) =>
  getMessageParts(message).filter(isToolPart).length;

const renderMessage = (message: AssistantConversationExportMessage, index: number) => {
  const payload = getMessagePayload(message);
  const parts = getMessageParts(message);
  const createdAt = message.createdAt ?? payload?.createdAt;
  const lines = [
    `## ${index + 1}. ${roleLabel(payload?.role)}`,
    `- Message ID: \`${message.id}\``,
    `- Parent ID: ${message.parentId ? `\`${message.parentId}\`` : "None"}`,
    `- Storage format: \`${message.format}\``,
    `- Created: ${formatDate(createdAt as Date | string | null | undefined)}`,
    `- Tool calls: ${getMessageToolCount(message)}`,
  ];

  if (payload?.status !== undefined) lines.push(`- Status: \`${JSON.stringify(redactDebugValue(payload.status))}\``);
  if (parts.length === 0) lines.push("", "_No normalized message parts were stored._", fencedJson(message.content));
  else lines.push("", ...parts.map((part, partIndex) => renderMessagePart(part, partIndex + 1)));

  if (payload?.attachments !== undefined) {
    lines.push("", "<details>", "<summary>Attachments</summary>", fencedJson(payload.attachments), "</details>");
  }
  if (payload?.metadata !== undefined) {
    lines.push("", "<details>", "<summary>Server metadata</summary>", fencedJson(payload.metadata), "</details>");
  }
  return lines.join("\n");
};

export const buildAssistantMessageMarkdown = (message: AssistantConversationExportMessage, exportedAt = new Date()) => {
  const title = `${roleLabel(getMessagePayload(message)?.role)} ${message.id}`;
  return `# ${title}\n\n> Assistant debugging export. Secret-looking fields and embedded file data are redacted.\n\n- Exported: ${exportedAt.toISOString()}\n\n${renderMessage(message, 0)}\n`;
};

export const buildAssistantConversationMarkdown = ({
  thread,
  messages,
  exportedAt = new Date(),
}: AssistantConversationExportInput) => {
  const title = thread.title?.trim() || "Untitled assistant conversation";
  const toolCount = messages.reduce((total, message) => total + getMessageToolCount(message), 0);
  const header = [
    `# ${title}`,
    "",
    "> Assistant debugging export. Secret-looking fields and embedded file data are redacted.",
    "",
    `- Conversation ID: \`${thread.id}\``,
    `- Model: ${thread.modelId ? `\`${thread.modelId}\`` : "Not recorded"}`,
    `- Created: ${formatDate(thread.createdAt)}`,
    `- Updated: ${formatDate(thread.updatedAt)}`,
    `- Exported: ${exportedAt.toISOString()}`,
    `- Stored messages: ${messages.length}`,
    `- Tool calls: ${toolCount}`,
  ];

  if (messages.length === 0) return `${header.join("\n")}\n\n_No messages have been stored for this conversation._\n`;
  return `${header.join("\n")}\n\n${messages.map(renderMessage).join("\n\n---\n\n")}\n`;
};

export const getAssistantConversationExportFilename = (title: string | null | undefined, threadId: string) => {
  const slug = (title?.trim() || "assistant-conversation")
    .normalize("NFKD")
    .replaceAll(/\p{Mark}+/gu, "")
    .replaceAll(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "")
    .slice(0, 64)
    .toLowerCase();
  return `${slug || "assistant-conversation"}-${threadId.slice(0, 8)}.md`;
};
