import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";

import {
  CUSTOM_WIDGET_ASSISTANT_POLICY,
  CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION,
} from "@homarr/custom-widgets/authoring-prompt";
import { getCustomWidgetPlacementToolNames, resolveCustomWidgetPlacementState } from "@homarr/custom-widgets/core";
import type { CustomWidgetAssistantLifecycleEvent } from "@homarr/custom-widgets/core";

const mutationApprovalInstruction =
  "Uses Homarr's native approval UI; call when inputs are ready without separate prose confirmation.";

export const customWidgetAssistantInstructions = `\n\n${CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION}\n\n${CUSTOM_WIDGET_ASSISTANT_POLICY}`;

export const withAssistantToolPolicy = (description: string | undefined, requiresApproval: boolean) => {
  if (!requiresApproval) return description;
  if (!description) return mutationApprovalInstruction;
  return `${description}\n\n${mutationApprovalInstruction}`;
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
  if (!(toolName in nextToolByHumanTool)) return undefined;
  return nextToolByHumanTool[toolName as keyof typeof nextToolByHumanTool];
};

interface AssistantToolExecutionStep {
  toolResults: readonly CustomWidgetAssistantLifecycleEvent[];
}

interface AssistantToolResponseMessage {
  role: string;
  content: unknown;
}

const getLifecycleEvents = (
  messages: UIMessage[],
  completedSteps: readonly AssistantToolExecutionStep[],
  responseMessages: readonly AssistantToolResponseMessage[],
): CustomWidgetAssistantLifecycleEvent[] => {
  const latestUserIndex = messages.findLastIndex((message) => message.role === "user");
  const messageEvents = messages.slice(Math.max(0, latestUserIndex)).flatMap((message) => {
    if (message.role !== "assistant") return [];
    return message.parts.flatMap((part) => {
      if (!isToolUIPart(part) || part.state !== "output-available") return [];
      return [{ toolCallId: part.toolCallId, toolName: getToolName(part), input: part.input, output: part.output }];
    });
  });
  const responseEvents = responseMessages.flatMap((message) => {
    if (message.role !== "tool" || !Array.isArray(message.content)) return [];
    return message.content.flatMap((part) => {
      if (typeof part !== "object" || part === null || !("type" in part && part.type === "tool-result")) return [];
      if (!("toolName" in part) || typeof part.toolName !== "string" || !("output" in part)) return [];
      let output = part.output;
      if (typeof output === "object" && output !== null && "type" in output && output.type === "json") {
        output = "value" in output ? output.value : undefined;
      }
      return [
        {
          ...("toolCallId" in part && typeof part.toolCallId === "string" ? { toolCallId: part.toolCallId } : {}),
          toolName: part.toolName,
          ...("input" in part ? { input: part.input } : {}),
          output,
        },
      ];
    });
  });
  return [...messageEvents, ...responseEvents, ...completedSteps.flatMap((step) => step.toolResults)];
};

export const getCustomWidgetPlacementState = (
  messages: UIMessage[],
  completedSteps: readonly AssistantToolExecutionStep[] = [],
  responseMessages: readonly AssistantToolResponseMessage[] = [],
) => resolveCustomWidgetPlacementState(getLifecycleEvents(messages, completedSteps, responseMessages));

export const hasPendingCustomWidgetPlacement = (
  messages: UIMessage[],
  completedSteps: readonly AssistantToolExecutionStep[] = [],
  responseMessages: readonly AssistantToolResponseMessage[] = [],
) => getCustomWidgetPlacementState(messages, completedSteps, responseMessages).status !== "none";

export const getRequiredAssistantToolNames = (
  messages: UIMessage[],
  completedSteps: readonly AssistantToolExecutionStep[] = [],
  responseMessages: readonly AssistantToolResponseMessage[] = [],
) => getCustomWidgetPlacementToolNames(getCustomWidgetPlacementState(messages, completedSteps, responseMessages));
