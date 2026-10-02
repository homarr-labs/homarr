import type { ToolCallMessagePartStatus } from "@assistant-ui/react";

export const hasCompleteAssistantToolArguments = (status: ToolCallMessagePartStatus | undefined) =>
  status?.type !== "running" && status?.type !== "incomplete";

export const hasFailedAssistantToolArguments = (status: ToolCallMessagePartStatus | undefined) =>
  status?.type === "incomplete";
