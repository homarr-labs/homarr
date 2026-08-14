import { convertToModelMessages } from "ai";
import type { UIMessage } from "ai";

import { customWidgetPreviewQueryOutputMaxCharacters, toAssistantToolOutput } from "./assistant-tool-output";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const compactPreviewQueryOutputs = (messages: UIMessage[]): UIMessage[] =>
  messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (!isRecord(part) || typeof part.type !== "string") return part;
      const record: Record<string, unknown> = part;
      const toolName =
        part.type === "dynamic-tool" ? record.toolName : part.type.startsWith("tool-") ? part.type.slice(5) : undefined;
      if (toolName !== "customWidget_previewQuery" || record.state !== "output-available") return part;

      return {
        ...part,
        output: toAssistantToolOutput(record.output, {
          maxCharacters: customWidgetPreviewQueryOutputMaxCharacters,
        }),
      } as unknown as typeof part;
    }),
  }));

export const convertAssistantMessagesToModelMessages = (messages: UIMessage[]) =>
  convertToModelMessages(compactPreviewQueryOutputs(messages), {
    // An aborted response can leave a streamed tool call in conversation history without a
    // result. Replaying it makes several OpenAI-compatible providers reject the whole prompt.
    ignoreIncompleteToolCalls: true,
  });
