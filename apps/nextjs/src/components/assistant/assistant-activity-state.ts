import type { AssistantDotMatrixState } from "./assistant-dot-matrix";

interface AssistantActivityStateInput {
  isRunning: boolean;
  latestPartType: string | undefined;
  needsApproval: boolean;
  failed: boolean;
}

export const getRunningAssistantPartType = (
  messageStatusType: string | undefined,
  latestPartType: string | undefined,
) => (messageStatusType === "running" ? latestPartType : undefined);

export const getAssistantActivityState = ({
  isRunning,
  latestPartType,
  needsApproval,
  failed,
}: AssistantActivityStateInput): AssistantDotMatrixState => {
  if (isRunning) {
    if (latestPartType === "tool-call") return "waiting";
    if (latestPartType === undefined || latestPartType === "reasoning") return "thinking";
    return "streaming";
  }
  if (needsApproval) return "waiting";
  if (failed) return "error";
  return "success";
};
