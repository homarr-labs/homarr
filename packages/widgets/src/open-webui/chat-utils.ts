import type { ChatMessage, CompletionMessage } from "./chat-types";

// Heuristic fallback for detecting vision-capable models when Open WebUI does
// not declare the capability explicitly.
export const VISION_MODEL_PATTERN =
  /vision|llava|bakllava|moondream|minicpm-?v|qwen2?-?vl|pixtral|cogvlm|internvl|gemma3|smolvlm|granite[\w-]*vision/i;

export const readBlobAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result as string));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Failed to read file")));
    reader.readAsDataURL(blob);
  });

export const hostnameOf = (url: string): string => {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
};

export const formatSeconds = (total: number): string => {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

// Convert displayed messages to the OpenAI completion format, inlining any
// attached images on the message that carries them (vision content parts).
export const toCompletionMessages = (messages: ChatMessage[]): CompletionMessage[] =>
  messages.map((message) =>
    message.images && message.images.length > 0
      ? {
          role: message.role,
          content: [
            ...(message.content ? [{ type: "text" as const, text: message.content }] : []),
            ...message.images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
          ],
        }
      : { role: message.role, content: message.content },
  );

type RawMessage = { role?: string | null; content?: string | null };
type HistoryMessage = RawMessage & { parentId?: string | null };
interface RawChat {
  messages?: RawMessage[] | null;
  history?: { currentId?: string | null; messages?: Record<string, HistoryMessage> | null } | null;
}

const toChatMessage = (role: string | null | undefined, content: string | null | undefined): ChatMessage | null =>
  (role === "system" || role === "user" || role === "assistant") && typeof content === "string"
    ? { role, content }
    : null;

/**
 * Reconstructs the ordered conversation from an Open WebUI chat. Chats created in
 * the Open WebUI UI store the active branch as a tree under `chat.history`
 * (walk from `currentId` up through `parentId`); `chat.messages` can be stale, so
 * the history tree takes precedence and we fall back to the flat list.
 */
export const extractChatMessages = (chat: RawChat | null | undefined): ChatMessage[] => {
  const history = chat?.history;
  if (history?.messages && history.currentId) {
    const map = history.messages;
    const ordered: ChatMessage[] = [];
    const seen = new Set<string>();
    let cursor: string | null | undefined = history.currentId;
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const node: HistoryMessage | undefined = map[cursor];
      if (!node) break;
      const message = toChatMessage(node.role, node.content);
      if (message) ordered.unshift(message);
      cursor = node.parentId;
    }
    if (ordered.length > 0) return ordered;
  }
  return (chat?.messages ?? [])
    .map((message) => toChatMessage(message.role, message.content))
    .filter((message): message is ChatMessage => message !== null);
};
