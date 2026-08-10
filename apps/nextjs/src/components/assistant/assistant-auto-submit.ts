import {
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import type { UIMessage } from "ai";

type AutoSubmitOptions = Parameters<typeof lastAssistantMessageIsCompleteWithToolCalls>[0];

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
  lastAssistantMessageIsCompleteWithToolCalls(options);
