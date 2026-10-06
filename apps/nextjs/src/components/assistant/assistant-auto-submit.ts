import { getToolName, isToolUIPart, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import type { UIMessage } from "ai";

import { browserToolContracts } from "./assistant-tool-contracts";

type AutoSubmitOptions = Parameters<typeof lastAssistantMessageIsCompleteWithApprovalResponses>[0];

const browserToolNames = new Set(Object.keys(browserToolContracts));

const lastAssistantMessageHasCompleteBrowserToolCalls = (messages: UIMessage[]) => {
  const message = messages.at(-1);
  if (message?.role !== "assistant") return false;

  const lastStepStartIndex = message.parts.reduce(
    (lastIndex, part, index) => (part.type === "step-start" ? index : lastIndex),
    -1,
  );
  const localToolParts = message.parts
    .slice(lastStepStartIndex + 1)
    .filter(isToolUIPart)
    .filter((part) => !part.providerExecuted);
  const browserToolParts = localToolParts.filter((part) => browserToolNames.has(getToolName(part)));

  return (
    browserToolParts.length > 0 &&
    localToolParts.every((part) => part.state === "output-available" || part.state === "output-error")
  );
};

const lastAssistantMessageHasCompleteLocalApprovalResponses = (messages: UIMessage[]) => {
  const message = messages.at(-1);
  if (message?.role !== "assistant") return false;

  const lastStepStartIndex = message.parts.reduce(
    (lastIndex, part, index) => (part.type === "step-start" ? index : lastIndex),
    -1,
  );
  const localToolParts = message.parts
    .slice(lastStepStartIndex + 1)
    .filter(isToolUIPart)
    .filter((part) => !part.providerExecuted);

  return (
    localToolParts.some((part) => part.state === "approval-responded") &&
    localToolParts.every(
      (part) =>
        part.state === "output-available" || part.state === "output-error" || part.state === "approval-responded",
    )
  );
};

export const shouldAutomaticallyContinueAssistant = (options: AutoSubmitOptions) =>
  lastAssistantMessageIsCompleteWithApprovalResponses(options) ||
  lastAssistantMessageHasCompleteLocalApprovalResponses(options.messages) ||
  lastAssistantMessageHasCompleteBrowserToolCalls(options.messages);
