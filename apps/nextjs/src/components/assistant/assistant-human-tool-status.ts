import type { ToolCallMessagePartStatus } from "@assistant-ui/react";

export const hasCompleteAssistantToolArguments = (status: ToolCallMessagePartStatus | undefined) =>
  status?.type !== "running";
