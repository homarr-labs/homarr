import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";

import { isRecord } from "@homarr/common";
import {
  getCustomWidgetPhaseToolNames,
  hasCustomWidgetAuthoringContinuationIntent,
  isRecoverableCustomWidgetAuthoringFailure,
  isSuccessfulCustomWidgetAuthoringAdvance,
} from "@homarr/custom-widgets/core";
import { widgetKinds } from "@homarr/definitions";

export { getCustomWidgetPhaseToolNames };

interface CustomWidgetToolResponseMessage {
  role: string;
  content: unknown;
}

interface CustomWidgetToolResult {
  toolCallId?: string;
  toolName: string;
  output: unknown;
}

interface CustomWidgetToolCall {
  toolCallId?: string;
  toolName: string;
}

export interface CustomWidgetToolStep {
  toolResults: readonly CustomWidgetToolResult[];
  toolCalls?: readonly CustomWidgetToolCall[];
}

const unwrapCustomWidgetToolOutput = (output: unknown) => {
  if (!isRecord(output) || output.type !== "json" || !("value" in output)) return output;
  return output.value;
};

/**
 * Approved tools execute before AI SDK step zero on an approval continuation.
 * Project those server-produced tool results into the same phase shape used by
 * the in-request step state so lifecycle staging survives the continuation.
 */
export const getCustomWidgetToolStepsFromResponseMessages = (messages: readonly CustomWidgetToolResponseMessage[]) =>
  messages.flatMap((message) => {
    if (message.role !== "tool" || !Array.isArray(message.content)) return [];
    const toolResults = message.content.flatMap((part) => {
      if (!isRecord(part) || part.type !== "tool-result" || typeof part.toolName !== "string") return [];
      return [
        {
          ...(typeof part.toolCallId === "string" ? { toolCallId: part.toolCallId } : {}),
          toolName: part.toolName,
          output: unwrapCustomWidgetToolOutput(part.output),
        },
      ];
    });
    return toolResults.length > 0 ? [{ toolResults }] : [];
  });

const hasPendingNonCustomToolCall = (step: CustomWidgetToolStep) => {
  const toolCalls = step.toolCalls ?? [];
  if (toolCalls.length === 0) return false;
  const completedCallIds = new Set(
    step.toolResults.flatMap((result) => (result.toolCallId === undefined ? [] : [result.toolCallId])),
  );
  const completedToolNames = new Set(step.toolResults.map((result) => result.toolName));
  return toolCalls.some(
    (call) =>
      !call.toolName.startsWith("customWidget_") &&
      (call.toolCallId === undefined ? !completedToolNames.has(call.toolName) : !completedCallIds.has(call.toolCallId)),
  );
};

const getLatestUserText = (messages: readonly UIMessage[]) => {
  const latestUserMessage = messages.findLast((message) => message.role === "user");
  if (!latestUserMessage) return "";
  return latestUserMessage.parts
    .flatMap((part) => (isRecord(part) && part.type === "text" && typeof part.text === "string" ? [part.text] : []))
    .join("\n");
};

const hasFollowUpCustomWidgetTool = (activeToolNames: readonly string[], latestToolName: string) =>
  activeToolNames.some((toolName) => toolName.startsWith("customWidget_") && toolName !== latestToolName);

const hasActiveCustomWidgetTool = (activeToolNames: readonly string[]) =>
  activeToolNames.some((toolName) => toolName.startsWith("customWidget_"));

const hasLatestClientToolOutcome = (messages: readonly UIMessage[]) => {
  const latestUserIndex = messages.findLastIndex((message) => message.role === "user");
  const latestAssistantMessage = messages
    .slice(latestUserIndex + 1)
    .toReversed()
    .find((message) => message.role === "assistant");
  if (!latestAssistantMessage) return false;
  const latestToolPart = latestAssistantMessage.parts.toReversed().find((part) => isToolUIPart(part));
  return latestToolPart !== undefined && !getToolName(latestToolPart).startsWith("customWidget_");
};

/**
 * Providers sometimes stop after successful discovery or validation without issuing the next tool call.
 * Require a tool only for an actionable build/edit transition; leave tool choice open for validation-only
 * requests, repairs, clarification, client-side tools, errors, and the completed save path.
 */
export const shouldRequireCustomWidgetAuthoringTool = (
  activeToolNames: readonly string[],
  steps: readonly CustomWidgetToolStep[],
  responseSteps: readonly CustomWidgetToolStep[] = [],
  messages: readonly UIMessage[] = [],
) => {
  const latestUserText = getLatestUserText(messages);
  if (
    activeToolNames.length === 0 ||
    !hasCustomWidgetAuthoringContinuationIntent(latestUserText, hasRecentCustomWidgetLifecycleContext(messages)) ||
    hasLatestClientToolOutcome(messages)
  )
    return false;
  const currentSteps = steps.length > 0 ? steps : responseSteps;
  const latestStep = currentSteps.at(-1);
  if (!latestStep || hasPendingNonCustomToolCall(latestStep)) return false;
  return latestStep.toolResults.some((result) => {
    if (isRecoverableCustomWidgetAuthoringFailure(result.toolName, result.output)) {
      return hasActiveCustomWidgetTool(activeToolNames);
    }
    return (
      hasFollowUpCustomWidgetTool(activeToolNames, result.toolName) &&
      isSuccessfulCustomWidgetAuthoringAdvance(result.toolName, result.output)
    );
  });
};

const explicitCustomWidgetIntentPattern =
  /(?:\bcustom\s+jsx\b|\bhomarr-custom-widget-v\d+\b|\b(?:build|convert|create|design|edit|fix|make|migrate|repair|update|validate)\b[^\n]{0,80}\bcustom[\s-]+widgets?\b)/iu;
const customWidgetIntentPattern =
  /(?:\bcustom\s+jsx\b|\bhomarr-custom-widget-v\d+\b|\b(?:build|convert|create|design|edit|fix|make|migrate|repair|update|validate)\b[^\n]{0,80}\bcustom[\s-]+widgets?\b|\b(?:build|create|design|make)\s+(?:(?:me|us)\s+)?an?\s+[^\n]{1,60}\bwidgets?\b|\b(?:build|create|design|make)\b[^\n]{0,80}\bwidgets?\s+(?:for|using|with)\b|\b(?:i|we)\s+(?:need|want)\b[^\n]{0,60}\bwidgets?\s+(?:for|using|with)\b)/iu;
const nativeWidgetNames = widgetKinds
  .filter((kind) => kind !== "customApi")
  .map((kind) =>
    kind
      .replaceAll("-", " ")
      .replace(/([a-z\d])([A-Z])/gu, "$1 $2")
      .toLowerCase(),
  )
  .toSorted((left, right) => right.length - left.length)
  .join("|");
const nativeWidgetIntentPattern = new RegExp(
  `\\b(?:${nativeWidgetNames})\\s+widgets?\\b|\\bwidgets?\\s+(?:for|using|with)\\s+(?:${nativeWidgetNames})\\b`,
  "iu",
);

const customWidgetBootstrapToolNames = new Set(["customWidget_getSkill"]);
const maxFocusedComponentSearchesPerPhase = 4;
const customWidgetContextToolBudgets: Readonly<Record<string, number>> = {
  customWidget_findComponents: maxFocusedComponentSearchesPerPhase,
  customWidget_getComponents: 1,
  customWidget_getComponent: 2,
  customWidget_getSharedProps: 1,
  customWidget_getExample: 1,
};

export const createCustomWidgetDiscoveryPhaseController = (limit = maxFocusedComponentSearchesPerPhase) => {
  const calls = new Map<string, number>();
  const reset = () => {
    calls.clear();
  };
  return {
    claim(toolName: string) {
      const configuredBudget = customWidgetContextToolBudgets[toolName];
      if (configuredBudget === undefined) return true;
      const budget = toolName === "customWidget_findComponents" ? limit : configuredBudget;
      const used = calls.get(toolName) ?? 0;
      if (used >= budget) return false;
      calls.set(toolName, used + 1);
      return true;
    },
    observe(toolName: string, output: unknown) {
      const result = isRecord(output) ? output : null;
      if (toolName === "customWidget_validateTemplate" && result?.valid === false) reset();
      if (toolName === "customWidget_previewCreate" && result?.success !== true) reset();
      if (toolName === "customWidget_createFromPreview" && typeof result?.id === "string") reset();
      if (toolName === "customWidget_updateFromPreview" && typeof result?.id === "string") reset();
    },
    observeFailure(toolName: string) {
      if (toolName === "customWidget_validateTemplate" || toolName === "customWidget_previewCreate") {
        reset();
        return;
      }
      if (customWidgetContextToolBudgets[toolName] === undefined) return;
      const used = calls.get(toolName) ?? 0;
      if (used <= 1) {
        calls.delete(toolName);
        return;
      }
      calls.set(toolName, used - 1);
    },
  };
};

const hasCustomWidgetToolPart = (message: UIMessage) =>
  message.parts.some((part) => {
    if (!isRecord(part) || typeof part.type !== "string") return false;
    let toolName: string | undefined;
    if (part.type === "dynamic-tool" && typeof part.toolName === "string") {
      toolName = part.toolName;
    } else if (part.type.startsWith("tool-")) {
      toolName = part.type.slice("tool-".length);
    }
    return toolName?.startsWith("customWidget_") === true;
  });

const hasRecentCustomWidgetLifecycleContext = (messages: readonly UIMessage[]) => {
  const latestMessage = messages.at(-1);
  if (latestMessage?.role === "assistant") return hasCustomWidgetToolPart(latestMessage);
  if (latestMessage?.role !== "user") return false;

  const precedingAssistantMessage = messages
    .slice(0, -1)
    .toReversed()
    .find((message) => message.role === "assistant");
  return precedingAssistantMessage !== undefined && hasCustomWidgetToolPart(precedingAssistantMessage);
};

const hasCustomWidgetAuthoringText = (text: string) => {
  if (explicitCustomWidgetIntentPattern.test(text)) return true;
  if (nativeWidgetIntentPattern.test(text)) return false;
  return customWidgetIntentPattern.test(text);
};

const hasExplicitCustomWidgetIntent = (message: UIMessage) =>
  message.role === "user" &&
  message.parts.some(
    (part) =>
      isRecord(part) &&
      part.type === "text" &&
      typeof part.text === "string" &&
      hasCustomWidgetAuthoringText(part.text),
  );

export const needsCustomWidgetAuthoringContext = (messages: UIMessage[]) => {
  const latestMessage = messages.at(-1);
  if (!latestMessage) return false;
  if (hasExplicitCustomWidgetIntent(latestMessage)) return true;
  return hasRecentCustomWidgetLifecycleContext(messages);
};

export const getActiveCustomWidgetToolNames = <TToolName extends string>(
  availableToolNames: readonly TToolName[],
  messages: UIMessage[],
  isAdmin: boolean,
) => {
  if (!isAdmin || !needsCustomWidgetAuthoringContext(messages)) return [];
  return availableToolNames.filter((toolName) => customWidgetBootstrapToolNames.has(toolName));
};
