import { convertToModelMessages, pruneMessages } from "ai";
import type { ModelMessage, UIMessage } from "ai";

import { isCustomWidgetToolName } from "@homarr/custom-widgets/core";

import { getAssistantToolOutputMaxCharacters, toAssistantToolOutput } from "./assistant-tool-output";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const reloadableCustomWidgetResourceToolNames = [
  "customWidget_getSkill",
  "customWidget_schema",
  "customWidget_getAuthoringPrompt",
  "customWidget_getComponentCatalog",
  "customWidget_findComponents",
  "customWidget_getReference",
  "customWidget_getComponent",
  "customWidget_getComponents",
  "customWidget_getSharedProps",
  "customWidget_getExample",
];

const compactableCustomWidgetResourceToolNames = reloadableCustomWidgetResourceToolNames.filter(
  (toolName) => toolName !== "customWidget_getSkill" && toolName !== "customWidget_getReference",
);

const iterativeCustomWidgetToolNames = [
  "customWidget_validateTemplate",
  "customWidget_previewCreate",
  "customWidget_previewReviseTemplate",
  "customWidget_previewQuery",
  "customWidget_previewAction",
  "customWidget_previewJournal",
];

const assistantStepContextMaxCharacters = 48_000;

const compactParallelCustomWidgetToolCalls = (messages: ModelMessage[]) => {
  const rejectedToolCallIds = new Set<string>();

  for (const message of messages) {
    if (message.role !== "assistant" || typeof message.content === "string") continue;
    let customWidgetToolSelected = false;
    let otherToolSelected = false;
    for (const part of message.content) {
      if (part.type !== "tool-call") continue;
      if (isCustomWidgetToolName(part.toolName)) {
        if (customWidgetToolSelected || otherToolSelected) {
          rejectedToolCallIds.add(part.toolCallId);
          continue;
        }
        customWidgetToolSelected = true;
        continue;
      }
      if (customWidgetToolSelected) {
        rejectedToolCallIds.add(part.toolCallId);
        continue;
      }
      otherToolSelected = true;
    }
  }
  if (rejectedToolCallIds.size === 0) return messages;

  const rejectedApprovalIds = new Set<string>();
  for (const message of messages) {
    if (message.role !== "assistant" || typeof message.content === "string") continue;
    for (const part of message.content) {
      if (part.type === "tool-approval-request" && rejectedToolCallIds.has(part.toolCallId)) {
        rejectedApprovalIds.add(part.approvalId);
      }
    }
  }

  const compacted: ModelMessage[] = [];
  for (const message of messages) {
    if ((message.role !== "assistant" && message.role !== "tool") || typeof message.content === "string") {
      compacted.push(message);
      continue;
    }
    const content = message.content.filter((part) => {
      if (
        (part.type === "tool-call" || part.type === "tool-result" || part.type === "tool-approval-request") &&
        rejectedToolCallIds.has(part.toolCallId)
      ) {
        return false;
      }
      if (part.type === "tool-approval-response" && rejectedApprovalIds.has(part.approvalId)) return false;
      return true;
    });
    if (content.length > 0) compacted.push({ ...message, content } as ModelMessage);
  }
  return compacted;
};

export const compactAssistantStepMessages = (
  messages: ModelMessage[],
  maxCharacters = assistantStepContextMaxCharacters,
) => {
  const sequentialMessages = compactParallelCustomWidgetToolCalls(messages);
  if (JSON.stringify(sequentialMessages).length <= maxCharacters) return sequentialMessages;
  return pruneMessages({
    messages: sequentialMessages,
    reasoning: "all",
    toolCalls: [
      { type: "before-last-3-messages", tools: compactableCustomWidgetResourceToolNames },
      { type: "before-last-message", tools: ["customWidget_validateTemplate"] },
      { type: "before-last-5-messages", tools: iterativeCustomWidgetToolNames.slice(1) },
    ],
    emptyMessages: "remove",
  });
};

const compactToolOutputs = (messages: UIMessage[]): UIMessage[] =>
  messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (!isRecord(part) || typeof part.type !== "string") return part;
      const record: Record<string, unknown> = part;
      let toolName: string | undefined;
      if (part.type === "dynamic-tool" && typeof record.toolName === "string") {
        toolName = record.toolName;
      } else if (part.type.startsWith("tool-")) {
        toolName = part.type.slice(5);
      }
      if (toolName === undefined || record.state !== "output-available") return part;

      return {
        ...part,
        output: toAssistantToolOutput(record.output, {
          maxCharacters: getAssistantToolOutputMaxCharacters(toolName),
        }),
      } as unknown as typeof part;
    }),
  }));

export const convertAssistantMessagesToModelMessages = async (messages: UIMessage[]) => {
  const modelMessages = await convertToModelMessages(compactToolOutputs(messages), {
    // An aborted response can leave a streamed tool call in conversation history without a
    // result. Replaying it makes several OpenAI-compatible providers reject the whole prompt.
    ignoreIncompleteToolCalls: true,
  });
  return pruneMessages({
    messages: modelMessages,
    toolCalls: [{ type: "all", tools: reloadableCustomWidgetResourceToolNames }],
  });
};
