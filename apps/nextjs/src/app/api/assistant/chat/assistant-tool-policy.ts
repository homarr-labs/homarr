import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";

import {
  CUSTOM_WIDGET_ASSISTANT_POLICY,
  CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION,
} from "@homarr/custom-widgets/authoring-prompt";
import {
  CUSTOM_WIDGET_ASSISTANT_COMPONENT_REFERENCE,
  CUSTOM_WIDGET_SKILL_REFERENCES,
} from "@homarr/custom-widgets/authoring-resources";
import { getCustomWidgetPlacementToolNames, resolveCustomWidgetPlacementState } from "@homarr/custom-widgets/core";
import type { CustomWidgetAssistantLifecycleEvent, CustomWidgetPlacementState } from "@homarr/custom-widgets/core";

const mutationApprovalInstruction =
  "Uses Homarr's native approval UI; call when inputs are ready without separate prose confirmation.";
// Previews are owner-scoped, short-lived drafts; these tools neither save widgets nor execute requests.
const assistantApprovalExemptToolNames = new Set([
  "customWidget_configurationRequestUser",
  "customWidget_previewCreate",
  "customWidget_previewReviseTemplate",
]);

export const customWidgetAssistantInstructions = `\n\nCUSTOM WIDGET REFERENCE
Apply this reference only when the user's task calls for creating, editing, or inspecting a Custom Widget. Its presence does not authorize a mutation or turn a navigation, documentation, or Workshop search question into widget creation.
${CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION}

AUTHORING REFERENCE — ALREADY LOADED
Use the schema, runtime, security rules and component contracts below directly. Do not retrieve Markdown references. Common component props and all registered names are supplied; only look up an uncommon component when its exact contract is missing. Draft the complete widget, then let preview validation report concrete errors rather than speculating about supported syntax.

${Object.values(CUSTOM_WIDGET_SKILL_REFERENCES).join("\n\n")}

${CUSTOM_WIDGET_ASSISTANT_COMPONENT_REFERENCE}

Function-call spread arguments are unsupported: use values.reduce((maximum, value) => Math.max(maximum, value), 0), not Math.max(...values). Use only the supplied iconNames (for example server, database, bell, cloud, circle-check), never React names such as IconServer.
Start the template directly with its root JSX element or fragment, without wrapping parentheses or Markdown fences; characters outside JSX render as literal text.
Design for a roughly 320px-wide compact tile. Keep essential dates, readings and action labels visible: shorten their format or use rows instead of truncating them with lineClamp. Screen-width breakpoints do not measure a dashboard tile's width.

${CUSTOM_WIDGET_ASSISTANT_POLICY}`;

export const withAssistantToolPolicy = (description: string | undefined, requiresApproval: boolean) => {
  if (!requiresApproval) return description;
  if (!description) return mutationApprovalInstruction;
  return `${description}\n\n${mutationApprovalInstruction}`;
};

export const requiresAssistantToolApproval = (toolName: string, toolType: string) =>
  toolType === "mutation" && !assistantApprovalExemptToolNames.has(toolName);

export const hasDeniedAssistantToolApproval = (messages: UIMessage[]) => {
  const latestUserIndex = messages.findLastIndex((message) => message.role === "user");
  return messages
    .slice(Math.max(0, latestUserIndex))
    .some(
      (message) =>
        message.role === "assistant" &&
        message.parts.some(
          (part) =>
            isToolUIPart(part) &&
            (part.state === "output-denied" ||
              (part.state === "approval-responded" && part.approval.approved === false)),
        ),
    );
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

const explicitUnplacedCustomWidgetPattern =
  /\b(?:leave|keep|remain|save)\b[^\n]{0,40}\bunplaced\b|\b(?:do not|don't|dont|without)\b[^\n]{0,40}\b(?:place|placement)\b[^\n]{0,40}\b(?:board|dashboard)\b/iu;

const hasExplicitUnplacedCustomWidgetIntent = (messages: readonly UIMessage[]) => {
  const latestUserMessage = messages.findLast((message) => message.role === "user");
  if (!latestUserMessage) return false;
  const text = latestUserMessage.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
  return explicitUnplacedCustomWidgetPattern.test(text);
};

export const getCustomWidgetPlacementState = (
  messages: UIMessage[],
  completedSteps: readonly AssistantToolExecutionStep[] = [],
  responseMessages: readonly AssistantToolResponseMessage[] = [],
): CustomWidgetPlacementState => {
  const state = resolveCustomWidgetPlacementState(getLifecycleEvents(messages, completedSteps, responseMessages));
  // An inferred targetBoardId must not override an explicit request to save without placement.
  if (hasExplicitUnplacedCustomWidgetIntent(messages)) return { status: "none" };
  return state;
};

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
