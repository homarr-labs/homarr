import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";

import { isRecord } from "@homarr/common";
import {
  getCustomWidgetPhaseToolNames,
  hasCustomWidgetAuthoringContinuationIntent,
  hasCustomWidgetAuthoringLifecycleResumeIntent,
  isRecoverableCustomWidgetAuthoringFailure,
  isSuccessfulCustomWidgetAuthoringAdvance,
} from "@homarr/custom-widgets/core";
import { getIntegrationName, integrationKinds, widgetKinds } from "@homarr/definitions";

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

const explicitCustomWidgetContinuePattern = /^\s*(?:continue|keep\s+going|proceed|go\s+on|finish|complete)\b/iu;

const getUiMessageText = (message: UIMessage) =>
  message.parts
    .flatMap((part) => (isRecord(part) && part.type === "text" && typeof part.text === "string" ? [part.text] : []))
    .join("\n");

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

/** Restore the current authoring phase when the user resumes after one or more
 * external source-configuration pauses or asks for a follow-up edit. Each UI
 * tool part represents one completed model step even though assistant-ui stores
 * an individual agent loop in one assistant message. */
export const getCustomWidgetToolStepsFromUiMessages = (messages: readonly UIMessage[]) => {
  const latestUserIndex = messages.findLastIndex((message) => message.role === "user");
  if (latestUserIndex <= 0) return [];
  const latestUserMessage = messages[latestUserIndex];
  if (
    !latestUserMessage ||
    !hasCustomWidgetAuthoringLifecycleResumeIntent(
      getUiMessageText(latestUserMessage),
      hasRecentCustomWidgetLifecycleContext(messages),
    )
  ) {
    return [];
  }
  let authoringStartIndex = 0;
  for (let index = latestUserIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== "user") continue;
    if (explicitCustomWidgetContinuePattern.test(getUiMessageText(message))) continue;
    authoringStartIndex = index + 1;
    break;
  }

  return messages.slice(authoringStartIndex, latestUserIndex).flatMap((message) => {
    if (message.role !== "assistant") return [];
    return message.parts.flatMap((part) => {
      if (!isToolUIPart(part) || part.state !== "output-available") return [];
      const toolName = getToolName(part);
      if (!toolName.startsWith("customWidget_")) return [];
      return [
        {
          toolResults: [
            {
              toolCallId: part.toolCallId,
              toolName,
              output: unwrapCustomWidgetToolOutput(part.output),
            },
          ],
        },
      ];
    });
  });
};

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
  return getUiMessageText(latestUserMessage);
};

const hasFollowUpCustomWidgetTool = (activeToolNames: readonly string[], latestToolName: string) =>
  activeToolNames.some((toolName) => toolName.startsWith("customWidget_") && toolName !== latestToolName);

const hasActiveCustomWidgetTool = (activeToolNames: readonly string[]) =>
  activeToolNames.some((toolName) => toolName.startsWith("customWidget_"));

const hasPendingHistoricalConfigurationRequest = (messages: readonly UIMessage[]) => {
  const statusByRequestId = new Map<string, unknown>();
  for (const step of getCustomWidgetToolStepsFromUiMessages(messages)) {
    for (const result of step.toolResults) {
      if (result.toolName !== "customWidget_configurationRequestUser") continue;
      const output = isRecord(result.output) ? result.output : null;
      if (typeof output?.requestId !== "string") continue;
      statusByRequestId.set(output.requestId, output.status);
    }
  }
  return [...statusByRequestId.values()].some((status) => status === "pending");
};

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
  if (!latestStep) {
    return (
      activeToolNames.length === 1 &&
      activeToolNames[0] === "customWidget_configurationRequestUser" &&
      explicitCustomWidgetContinuePattern.test(latestUserText) &&
      hasPendingHistoricalConfigurationRequest(messages)
    );
  }
  if (hasPendingNonCustomToolCall(latestStep)) return false;
  return latestStep.toolResults.some((result) => {
    if (isRecoverableCustomWidgetAuthoringFailure(result.toolName, result.output)) {
      return hasActiveCustomWidgetTool(activeToolNames);
    }
    if (
      result.toolName === "customWidget_configurationRequestUser" &&
      activeToolNames.includes(result.toolName) &&
      isSuccessfulCustomWidgetAuthoringAdvance(result.toolName, result.output)
    ) {
      return true;
    }
    return (
      hasFollowUpCustomWidgetTool(activeToolNames, result.toolName) &&
      isSuccessfulCustomWidgetAuthoringAdvance(result.toolName, result.output)
    );
  });
};

const explicitCustomWidgetIntentPattern =
  /(?:\bcustom\s+jsx\b|\bhomarr-custom-widget-v\d+\b|\b(?:add|adjust|build|change|convert|create|design|edit|fix|make|migrate|modify|remove|repair|update|validate)\b[^\n]{0,80}\bcustom[\s-]+widgets?\b)/iu;
const boardManagementIntentPattern =
  /\b(?:build|create|design|fill|make|populate|set\s*up)\b(?:(?!\bwidgets?\b)[^\n]){0,60}\b(?:board|dashboard)\b/iu;
const serviceWidgetIntentPatterns = [
  /\b(?:build|create|design|make)\s+(?:(?:me|us)\s+)?an?\s+([^\n,.!?]{1,60}?)\s+widgets?\b/iu,
  /\b(?:build|create|design|make)\b[^\n]{0,40}\bwidgets?\s+(?:for|using|with)\s+([^\n,.!?]{1,60})/iu,
  /\b(?:i|we)\s+(?:need|want)\b[^\n]{0,40}\bwidgets?\s+(?:for|using|with)\s+([^\n,.!?]{1,60})/iu,
];
const serviceTargetNoiseWords = new Set([
  "a",
  "an",
  "another",
  "api",
  "beautiful",
  "compact",
  "existing",
  "integration",
  "my",
  "new",
  "our",
  "polished",
  "responsive",
  "service",
  "simple",
  "some",
  "that",
  "the",
  "this",
  "those",
  "your",
]);
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
const nativeWidgetTargets = new Set(nativeWidgetNames.split("|"));
const integrationTargets = new Set(
  integrationKinds.flatMap((kind) => [
    kind
      .replaceAll("-", " ")
      .replace(/([a-z\d])([A-Z])/gu, "$1 $2")
      .toLowerCase(),
    getIntegrationName(kind).toLowerCase(),
  ]),
);

const includesTarget = (candidate: string, targets: ReadonlySet<string>) => {
  for (const target of targets) {
    if (
      candidate === target ||
      candidate.startsWith(`${target} `) ||
      candidate.endsWith(` ${target}`) ||
      candidate.includes(` ${target} `)
    ) {
      return true;
    }
  }
  return false;
};

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
  if (boardManagementIntentPattern.test(text)) return false;
  if (explicitCustomWidgetIntentPattern.test(text)) return true;
  if (nativeWidgetIntentPattern.test(text)) return false;

  return serviceWidgetIntentPatterns.some((pattern) => {
    const target = pattern.exec(text)?.[1];
    if (!target) return false;

    const targetWithoutPlacement = target
      .replace(/\s+(?:in|on|to)\s+(?:(?:my|our|the|this)\s+)?(?:board|dashboard)\b.*$/iu, "")
      .trim();
    const targetWords = targetWithoutPlacement.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const meaningfulTargetWords = targetWords.filter(
      (word) =>
        !serviceTargetNoiseWords.has(word.toLowerCase()) &&
        word.toLowerCase() !== "board" &&
        word.toLowerCase() !== "dashboard" &&
        word.toLowerCase() !== "widget" &&
        word.toLowerCase() !== "widgets",
    );
    const meaningfulTarget = meaningfulTargetWords.join(" ").toLowerCase();
    if (includesTarget(meaningfulTarget, nativeWidgetTargets)) return false;
    if (includesTarget(meaningfulTarget, integrationTargets)) return true;
    return meaningfulTargetWords.length > 0;
  });
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
