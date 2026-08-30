import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";

import {
  CUSTOM_WIDGET_ASSISTANT_POLICY,
  CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION,
} from "@homarr/custom-widgets/authoring-prompt";

const mutationApprovalInstruction =
  "Uses Homarr's native approval UI; call when inputs are ready without separate prose confirmation.";

export const customWidgetAssistantInstructions = `\n\n${CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION}\n\n${CUSTOM_WIDGET_ASSISTANT_POLICY}`;

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

interface AssistantToolExecutionStep {
  toolResults: readonly {
    toolName: string;
    output: unknown;
  }[];
}

interface AssistantToolResponseMessage {
  role: string;
  content: unknown;
}

const customWidgetCreateToolNames = new Set(["customWidget_create", "customWidget_createFromPreview"]);

const getCustomWidgetCreateFollowup = (output: unknown) => {
  if (typeof output !== "object" || output === null) return [];
  if (!("id" in output) || typeof output.id !== "string" || output.id.length === 0) return [];
  if (!("managementPath" in output) || typeof output.managementPath !== "string" || output.managementPath.length === 0)
    return [];
  if ("error" in output && output.error !== undefined) return [];

  const nextAction = "nextAction" in output ? output.nextAction : undefined;
  const targetIsKnown =
    typeof nextAction === "object" &&
    nextAction !== null &&
    "targetBoardId" in nextAction &&
    typeof nextAction.targetBoardId === "string" &&
    nextAction.targetBoardId.length > 0;
  return targetIsKnown ? ["configure_widget"] : ["configure_widget", "ask_user"];
};

const getCustomWidgetCreateOutputFromResponseMessages = (messages: readonly AssistantToolResponseMessage[]) => {
  for (const message of messages.toReversed()) {
    if (message.role !== "tool" || !Array.isArray(message.content)) continue;
    for (const part of message.content.toReversed()) {
      if (typeof part !== "object" || part === null) continue;
      if (!("type" in part) || part.type !== "tool-result") continue;
      if (!("toolName" in part) || !customWidgetCreateToolNames.has(String(part.toolName))) continue;
      if (!("output" in part)) continue;

      const output = part.output;
      if (typeof output === "object" && output !== null && "type" in output && output.type === "json") {
        return "value" in output ? output.value : undefined;
      }
      return output;
    }
  }
  return undefined;
};

export const getRequiredAssistantToolNames = (
  messages: UIMessage[],
  completedSteps: readonly AssistantToolExecutionStep[] = [],
  responseMessages: readonly AssistantToolResponseMessage[] = [],
) => {
  if (completedSteps.length > 0) {
    const latestCreateResult = completedSteps
      .at(-1)
      ?.toolResults.toReversed()
      .find((result) => customWidgetCreateToolNames.has(result.toolName));
    return latestCreateResult ? getCustomWidgetCreateFollowup(latestCreateResult.output) : [];
  }

  const responseCreateOutput = getCustomWidgetCreateOutputFromResponseMessages(responseMessages);
  if (responseCreateOutput !== undefined) return getCustomWidgetCreateFollowup(responseCreateOutput);

  const latestMessage = messages.at(-1);
  if (latestMessage?.role !== "assistant") return [];
  const latestToolPart = latestMessage.parts.toReversed().find((part) => isToolUIPart(part));
  if (
    latestToolPart === undefined ||
    latestToolPart.state !== "output-available" ||
    !customWidgetCreateToolNames.has(getToolName(latestToolPart))
  ) {
    return [];
  }
  return getCustomWidgetCreateFollowup(latestToolPart.output);
};
