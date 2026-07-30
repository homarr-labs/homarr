import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";

const mutationApprovalInstruction =
  "This action is protected by Homarr's native approval UI. When the user's request and the required inputs are clear, call this tool immediately. The tool call only requests approval; it does not execute until the user selects Approve and run. Never ask for confirmation in prose before calling it.";

export const withAssistantToolPolicy = (description: string | undefined, requiresApproval: boolean) => {
  if (!requiresApproval) return description;
  return description ? `${description}\n\n${mutationApprovalInstruction}` : mutationApprovalInstruction;
};

export const getForcedAssistantToolName = (messages: UIMessage[]) => {
  const latestMessage = messages.at(-1);
  if (latestMessage?.role !== "assistant") return undefined;

  const latestToolPart = latestMessage.parts.toReversed().find((part) => isToolUIPart(part));
  if (
    latestToolPart === undefined ||
    getToolName(latestToolPart) !== "configure_app" ||
    latestToolPart.state !== "output-available"
  ) {
    return undefined;
  }

  return "app_create" as const;
};
