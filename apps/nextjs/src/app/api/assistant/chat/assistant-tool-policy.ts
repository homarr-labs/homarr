import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";

import {
  CUSTOM_WIDGET_ASSISTANT_POLICY,
  CUSTOM_WIDGET_LAZY_TOOL_DISCOVERY_INSTRUCTION,
} from "@homarr/custom-widgets/authoring-prompt";

const mutationApprovalInstruction =
  "Uses Homarr's native approval UI; call when inputs are ready without separate prose confirmation.";

export const customWidgetAssistantInstructions = `\n\n${CUSTOM_WIDGET_LAZY_TOOL_DISCOVERY_INSTRUCTION}\n\n${CUSTOM_WIDGET_ASSISTANT_POLICY}`;

export const withAssistantToolPolicy = (description: string | undefined, requiresApproval: boolean) => {
  if (!requiresApproval) return description;
  return description ? `${description}\n\n${mutationApprovalInstruction}` : mutationApprovalInstruction;
};

export const getForcedAssistantToolName = (messages: UIMessage[]) => {
  const latestMessage = messages.at(-1);
  if (latestMessage?.role !== "assistant") return undefined;

  const latestToolPart = latestMessage.parts.toReversed().find((part) => isToolUIPart(part));
  if (latestToolPart === undefined || latestToolPart.state !== "output-available") return undefined;

  const nextToolByHumanTool = {
    configure_app: "app_create",
    configure_board_settings: "board_savePartialBoardSettings",
    configure_widget: "board_addItem",
  } as const;
  const toolName = getToolName(latestToolPart);
  if (
    (toolName === "configure_board_settings" || toolName === "configure_widget") &&
    typeof latestToolPart.output === "object" &&
    latestToolPart.output !== null &&
    "cancelled" in latestToolPart.output &&
    latestToolPart.output.cancelled === true
  ) {
    return undefined;
  }
  return toolName in nextToolByHumanTool
    ? nextToolByHumanTool[toolName as keyof typeof nextToolByHumanTool]
    : undefined;
};
