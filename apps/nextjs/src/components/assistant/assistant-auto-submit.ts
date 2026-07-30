import { lastAssistantMessageIsCompleteWithApprovalResponses, lastAssistantMessageIsCompleteWithToolCalls } from "ai";

type AutoSubmitOptions = Parameters<typeof lastAssistantMessageIsCompleteWithToolCalls>[0];

export const shouldAutomaticallyContinueAssistant = (options: AutoSubmitOptions) =>
  lastAssistantMessageIsCompleteWithApprovalResponses(options) || lastAssistantMessageIsCompleteWithToolCalls(options);
