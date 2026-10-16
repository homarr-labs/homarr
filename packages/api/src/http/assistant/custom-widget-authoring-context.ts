import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";

import { isRecord } from "@homarr/common";
import { getCustomWidgetExampleCatalog } from "@homarr/custom-widgets/authoring-resources";
import {
  assistantIntegrationResearchToolName,
  getCustomWidgetPhaseToolNames,
  getLatestLoadedCustomWidgetDefinition,
  getLatestPersistedCustomWidgetDefinitionId,
  hasCustomWidgetAuthoringContinuationIntent,
  hasCustomWidgetFreshCreationIntent,
  hasCustomWidgetAuthoringLifecycleResumeIntent,
  hasCustomWidgetStyleOnlyFollowUpIntent,
  hasExplicitCustomWidgetSourceChangeIntent,
  isRecoverableCustomWidgetAuthoringFailure,
  isSuccessfulCustomWidgetAuthoringAdvance,
  MAX_FOCUSED_COMPONENT_SEARCHES_PER_PHASE,
} from "@homarr/custom-widgets/core";
import type { CustomWidgetToolStep } from "@homarr/custom-widgets/core";
import { getIntegrationName, integrationKinds, widgetKinds } from "@homarr/definitions";

export { getCustomWidgetPhaseToolNames };

interface CustomWidgetToolResponseMessage {
  role: string;
  content: unknown;
}

export type { CustomWidgetToolStep };

/** An upstream outage cannot be repaired by rewriting JSX or recreating previews. */
export const getCustomWidgetPreviewOutageStatus = (steps: readonly CustomWidgetToolStep[]) => {
  for (const result of steps.at(-1)?.toolResults ?? []) {
    if (result.toolName !== "customWidget_previewQuery" && result.toolName !== "customWidget_previewAction") continue;
    const output = result.output;
    if (!isRecord(output) || output.ok !== false) continue;
    if (typeof output.status === "number" && output.status >= 500 && output.status <= 599) return output.status;
  }
  return undefined;
};

const unwrapCustomWidgetToolOutput = (output: unknown) => {
  if (!isRecord(output) || output.type !== "json" || !("value" in output)) return output;
  return output.value;
};

const explicitCustomWidgetContinuePattern = /^\s*(?:continue|keep\s+going|proceed|go\s+on|finish|complete)\b/iu;
const explicitCustomWidgetResumePattern =
  /^\s*(?:(?:continue|keep\s+going|proceed|go\s+on|finish|complete)\b|(?:(?:i(?:'ve|\s+have)?\s+)?(?:completed|configured|finished)|done\b|(?:the\s+)?(?:configuration|setup)\s+(?:is\s+)?(?:complete|completed|done|saved))\b)/iu;
const customWidgetLegacyMigrationPattern = /"\$schema"\s*:\s*"homarr-custom-widget-v1"/iu;

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
    if (hasCustomWidgetAuthoringLifecycleResumeIntent(getUiMessageText(message), true)) continue;
    authoringStartIndex = index + 1;
    break;
  }

  return messages.slice(authoringStartIndex).flatMap((message) => {
    if (message.role !== "assistant") return [];
    return message.parts.flatMap((part) => {
      if (!isToolUIPart(part) || part.state !== "output-available") return [];
      const toolName = getToolName(part);
      if (!toolName.startsWith("customWidget_") && toolName !== "integration_all" && toolName !== "ask_user") {
        return [];
      }
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

export const hasCustomWidgetLegacyMigrationContext = (messages: readonly UIMessage[]) => {
  const latestUserIndex = messages.findLastIndex((message) => message.role === "user");
  if (latestUserIndex < 0) return false;
  for (let index = latestUserIndex; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== "user") continue;
    const text = getUiMessageText(message);
    if (customWidgetLegacyMigrationPattern.test(text)) return true;
    if (hasCustomWidgetAuthoringLifecycleResumeIntent(text, true)) continue;
    return false;
  }
  return false;
};

const hasFollowUpCustomWidgetTool = (activeToolNames: readonly string[], latestToolName: string) =>
  activeToolNames.some((toolName) => toolName.startsWith("customWidget_") && toolName !== latestToolName);

const hasActiveCustomWidgetTool = (activeToolNames: readonly string[]) =>
  activeToolNames.some((toolName) => toolName.startsWith("customWidget_"));

const isSuccessfulPrerequisiteAdvance = (toolName: string, output: unknown) => {
  if (toolName === assistantIntegrationResearchToolName) {
    return isRecord(output) && output.recorded === true && output.status === "ready";
  }
  if (toolName === "homarr_enableToolGroups") {
    return isRecord(output) && !output.error && Array.isArray(output.enabledGroups);
  }
  if (toolName === "integration_getKinds" || toolName === "integration_all") return Array.isArray(output);
  if (toolName === "integration_request") return isRecord(output) && output.ok === true && !output.error;
  return false;
};

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
    if (hasActiveCustomWidgetTool(activeToolNames)) return true;
    return (
      activeToolNames.length === 1 &&
      activeToolNames[0] === "customWidget_configurationRequestUser" &&
      explicitCustomWidgetContinuePattern.test(latestUserText) &&
      hasPendingHistoricalConfigurationRequest(messages)
    );
  }
  if (hasPendingNonCustomToolCall(latestStep)) return false;
  return latestStep.toolResults.some((result) => {
    if (isSuccessfulPrerequisiteAdvance(result.toolName, result.output)) {
      if (result.toolName === "integration_all") {
        return (
          activeToolNames.includes(assistantIntegrationResearchToolName) ||
          activeToolNames.includes("customWidget_previewCreate") ||
          activeToolNames.includes("ask_user")
        );
      }
      return hasActiveCustomWidgetTool(activeToolNames);
    }
    if (
      result.toolName === "customWidget_getExample" &&
      isSuccessfulCustomWidgetAuthoringAdvance(result.toolName, result.output)
    ) {
      return activeToolNames.includes("integration_all") || hasActiveCustomWidgetTool(activeToolNames);
    }
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
const withoutNegatedBoardManagementIntent = (text: string) =>
  text.replace(
    /\b(?:do not|don't|dont)\s+(?:build|create|design|fill|make|populate|set\s*up)\b[^\n]{0,80}\b(?:board|dashboard)\b/giu,
    "",
  );
const serviceWidgetIntentPatterns = [
  /\b(?:build|create|design|make)(?:\s+and\s+(?:save|install))?\s+(?:an?\s+)?(?:custom[\s-]+)?widgets?\s+(?:for|using|with)\s+([^\n,.!?]{1,60})/iu,
  /\b(?:build|create|design|make)\b[^\n]{0,40}\bwidgets?\s+(?:for|using|with)\s+([^\n,.!?]{1,60})/iu,
  /\b(?:build|create|design|make)(?:\s+and\s+(?:save|install))?\s+(?:(?:me|us)\s+)?(?:an?\s+)?([^\n,.!?]{1,60}?)\s+widgets?\b/iu,
  /\b(?:i|we)\s+(?:need|want)\b[^\n]{0,40}\bwidgets?\s+(?:for|using|with)\s+([^\n,.!?]{1,60})/iu,
];
const serviceTargetNoiseWords = new Set([
  "a",
  "an",
  "another",
  "api",
  "beautiful",
  "compact",
  "custom",
  "existing",
  "integration",
  "jsx",
  "lookup",
  "my",
  "named",
  "new",
  "our",
  "polished",
  "responsive",
  "saved",
  "search",
  "service",
  "server",
  "simple",
  "small",
  "some",
  "static",
  "status",
  "summary",
  "that",
  "the",
  "these",
  "this",
  "those",
  "fixtures",
  "services",
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

const customWidgetContextToolBudgets: Readonly<Record<string, number>> = {
  customWidget_findComponents: MAX_FOCUSED_COMPONENT_SEARCHES_PER_PHASE,
  customWidget_getComponents: 1,
  customWidget_getComponent: 2,
  customWidget_getSharedProps: 1,
  customWidget_getExample: 1,
};

export const createCustomWidgetDiscoveryPhaseController = (limit = MAX_FOCUSED_COMPONENT_SEARCHES_PER_PHASE) => {
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

const hasDefinitionIdOption = (value: unknown) => {
  if (!isRecord(value) || !isRecord(value.options)) return false;
  return typeof value.options.definitionId === "string";
};

const isCustomWidgetPlacementToolPart = (part: Record<string, unknown>, toolName: string) => {
  if (toolName === "configure_widget") {
    return hasDefinitionIdOption(part.input) || hasDefinitionIdOption(part.output);
  }
  if (toolName === "board_addItem") return hasDefinitionIdOption(part.input);
  if (toolName !== "ask_user" || !isRecord(part.input) || !Array.isArray(part.input.options)) return false;
  const optionIds = new Set(
    part.input.options.flatMap((option) => (isRecord(option) && typeof option.id === "string" ? [option.id] : [])),
  );
  return optionIds.has("place") && optionIds.has("leave");
};

const customWidgetAuthoringLifecycleToolNames = new Set([
  // Loading a saved definition is the first authoring step for an explicit follow-up edit.
  "customWidget_get",
  "customWidget_validateTemplate",
  "customWidget_previewCreate",
  "customWidget_previewReviseTemplate",
  "customWidget_previewQuery",
  "customWidget_previewAction",
  "customWidget_previewJournal",
  "customWidget_configurationRequestUser",
  "customWidget_createFromPreview",
  "customWidget_updateFromPreview",
]);

const customWidgetDiscoveryToolNames = new Set([
  "customWidget_getSkill",
  "customWidget_list",
  "customWidget_schema",
  "customWidget_getAuthoringPrompt",
  "customWidget_getComponentCatalog",
  "customWidget_findComponents",
  "customWidget_getReference",
  "customWidget_getComponent",
  "customWidget_getComponents",
  "customWidget_getSharedProps",
  "customWidget_getExample",
]);

const getUiMessageToolName = (part: unknown) => {
  if (!isRecord(part) || typeof part.type !== "string") return null;
  if (part.type === "dynamic-tool" && typeof part.toolName === "string") return part.toolName;
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return null;
};

const hasToolPartFromSet = (message: UIMessage, toolNames: ReadonlySet<string>) =>
  message.parts.some((part) => {
    const toolName = getUiMessageToolName(part);
    return toolName !== null && toolNames.has(toolName);
  });

const hasCustomWidgetToolPart = (message: UIMessage) =>
  message.parts.some((part) => {
    const toolName = getUiMessageToolName(part);
    if (toolName === null) return false;
    if (customWidgetAuthoringLifecycleToolNames.has(toolName)) return true;
    if (toolName.startsWith("customWidget_")) return false;
    return isRecord(part) && isCustomWidgetPlacementToolPart(part, toolName);
  });

const hasRecentCustomWidgetLifecycleContext = (messages: readonly UIMessage[]) => {
  const latestMessage = messages.at(-1);
  if (latestMessage?.role === "assistant") return hasCustomWidgetToolPart(latestMessage);
  if (latestMessage?.role !== "user") return false;

  const previousUserIndex = messages.slice(0, -1).findLastIndex((message) => message.role === "user");
  const recentAssistantMessages = messages
    .slice(previousUserIndex + 1, -1)
    .filter((message) => message.role === "assistant");
  if (recentAssistantMessages.some(hasCustomWidgetToolPart)) return true;

  const previousUserMessage = messages[previousUserIndex];
  if (!previousUserMessage || !hasCustomWidgetAuthoringText(getUiMessageText(previousUserMessage))) return false;
  if (!hasCustomWidgetAuthoringLifecycleResumeIntent(getUiMessageText(latestMessage), true)) return false;
  return recentAssistantMessages.some((message) => hasToolPartFromSet(message, customWidgetDiscoveryToolNames));
};

export interface CustomWidgetFollowUpEditContext {
  definitionId: string;
  preserveDataContract: boolean;
  allowSourceChanges: boolean;
  loadedDefinition?: Record<string, unknown>;
}

export const getCustomWidgetFollowUpEditContext = (
  messages: readonly UIMessage[],
): CustomWidgetFollowUpEditContext | null => {
  const latestUserText = getLatestUserText(messages);
  if (!hasCustomWidgetAuthoringLifecycleResumeIntent(latestUserText, hasRecentCustomWidgetLifecycleContext(messages))) {
    return null;
  }
  const restoredSteps = getCustomWidgetToolStepsFromUiMessages(messages);
  const loadedDefinition = getLatestLoadedCustomWidgetDefinition(restoredSteps);
  let definitionId = getLatestPersistedCustomWidgetDefinitionId(restoredSteps);
  if (!definitionId && typeof loadedDefinition?.id === "string") definitionId = loadedDefinition.id;
  if (!definitionId) return null;
  const matchingLoadedDefinition = loadedDefinition?.id === definitionId ? loadedDefinition : undefined;
  let followUpRequestText = latestUserText;
  if (explicitCustomWidgetResumePattern.test(latestUserText)) {
    const previousRequest = messages
      .slice(0, -1)
      .toReversed()
      .find((message) => message.role === "user" && !explicitCustomWidgetResumePattern.test(getUiMessageText(message)));
    if (previousRequest) followUpRequestText = getUiMessageText(previousRequest);
  }
  return {
    definitionId,
    preserveDataContract: hasCustomWidgetStyleOnlyFollowUpIntent(followUpRequestText),
    allowSourceChanges: hasExplicitCustomWidgetSourceChangeIntent(followUpRequestText),
    ...(matchingLoadedDefinition ? { loadedDefinition: matchingLoadedDefinition } : {}),
  };
};

const isCustomWidgetGuidanceRequest = (text: string) =>
  /^\s*(?:(?:where|how)\s+(?:can|do|should|would)\s+(?:i|we)\b|(?:show|tell)\s+me\s+(?:how|where)\b|explain\s+(?:how|where)\b)/iu.test(
    text,
  ) || /\b(?:do not|don't|dont)\s+(?:change|modify|create|save|install)\s+anything\b/iu.test(text);

const getCustomWidgetServiceTargetFromText = (text: string) => {
  if (isCustomWidgetGuidanceRequest(text)) return null;
  if (!hasCustomWidgetFreshCreationIntent(text)) return null;
  for (const pattern of serviceWidgetIntentPatterns) {
    const target = pattern.exec(text)?.[1];
    if (!target) continue;
    // A trailing UI requirement is not the service supplying the widget's data.
    if (/^(?:(?:a|an|the)\s+)?(?:search|refresh|retry|submit)\s+(?:button|control)\b/iu.test(target.trim())) continue;

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
    if (includesTarget(meaningfulTarget, integrationTargets)) return meaningfulTarget;
    if (includesTarget(meaningfulTarget, nativeWidgetTargets)) return null;
    if (meaningfulTargetWords.length > 0) return meaningfulTarget;
  }
  return null;
};

const hasCustomWidgetAuthoringText = (text: string) => {
  if (isCustomWidgetGuidanceRequest(text)) return false;
  if (boardManagementIntentPattern.test(withoutNegatedBoardManagementIntent(text))) return false;
  if (explicitCustomWidgetIntentPattern.test(text)) return true;
  if (nativeWidgetIntentPattern.test(text)) return false;
  return getCustomWidgetServiceTargetFromText(text) !== null;
};

export const getRequestedCustomWidgetServiceTarget = (messages: readonly UIMessage[]) => {
  const latestUserMessage = messages.findLast((message) => message.role === "user");
  if (!latestUserMessage) return null;
  return getCustomWidgetServiceTargetFromText(getUiMessageText(latestUserMessage));
};

export const hasExplicitCustomWidgetComponentDiscoveryRequest = (messages: readonly UIMessage[]) => {
  const latestUserMessage = messages.findLast((message) => message.role === "user");
  if (!latestUserMessage) return false;
  const text = getUiMessageText(latestUserMessage);
  return /\bcomponent\s+discovery\b|\b(?:find|inspect|search(?:\s+for)?)\s+(?:(?:the|available|supported|registered|mantine|custom|widget)\s+){0,3}components?\b|\bcomponents?\s+(?:documentation|docs|reference)\b/iu.test(
    text,
  );
};

export const getRequestedCustomWidgetExampleId = (messages: readonly UIMessage[]) => {
  const latestUserMessage = messages.findLast((message) => message.role === "user");
  const text = latestUserMessage ? getUiMessageText(latestUserMessage).toLowerCase() : "";
  const explicitExample = getCustomWidgetExampleCatalog().find(({ title }) =>
    text.includes(`bundled ${title.toLowerCase()} example`),
  );
  if (explicitExample) return explicitExample.id;
  const target = getRequestedCustomWidgetServiceTarget(messages);
  if (target === null) return null;
  if (target === "dispatcharr" || (target.includes("dispatcharr") && /\bchannels?\b/iu.test(target))) {
    return "dispatcharr-channels";
  }
  if (target === "karakeep" || (target.includes("karakeep") && /\bbookmarks?\b/iu.test(target))) {
    return "karakeep-bookmarks";
  }
  if (target === "mealie" || (target.includes("mealie") && /\b(?:daily|meals?|plans?|today)\b/iu.test(target))) {
    return "mealie-today";
  }
  if (target === "romm" || (target.includes("romm") && /\b(?:games?|library|recent)\b/iu.test(target))) {
    return "romm-library";
  }
  const isTubeArchivist = target.includes("tube archivist") || target.includes("tubearchivist");
  if (
    target === "tube archivist" ||
    target === "tubearchivist" ||
    (isTubeArchivist && /\b(?:downloads?|queue)\b/iu.test(target))
  ) {
    return "tubearchivist-queue";
  }
  if (!target.includes("frigate")) return null;
  if (/\b(?:review|alerts?)\b/iu.test(target)) return "frigate-alerts";
  if (/\b(?:system|metrics?|stats?|health)\b/iu.test(target)) return "frigate-system";
  if (/\b(?:live|camera|streams?)\b/iu.test(target)) return "frigate-live-streams";
  return null;
};

export const getRequestedCustomWidgetExampleIds = (messages: readonly UIMessage[]) => {
  if (!hasMultiCustomWidgetCreationRequest(messages)) {
    const exampleId = getRequestedCustomWidgetExampleId(messages);
    return exampleId === null ? [] : [exampleId];
  }
  const text = getLatestUserText(messages).toLowerCase();
  const uncoveredTarget = text
    .replace(
      /\b(?:build|create|design|make|install|custom|widgets?|for|using|with|me|us|a|an|the|dispatcharr|karakeep|mealie|romm|tube\s*archivist|tubearchivist|frigate|channels?|bookmarks?|daily|meals?|plans?|today|games?|library|recent|downloads?|queue|live|camera|streams?|review|alerts?|system|metrics?|stats?|health|and|or)\b/giu,
      " ",
    )
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
  if (uncoveredTarget) return [];
  const candidates: Array<{ id: string; index: number }> = [];
  const add = (id: string, pattern: RegExp) => {
    const match = pattern.exec(text);
    if (match?.index === undefined) return;
    candidates.push({ id, index: match.index });
  };
  add("dispatcharr-channels", /\bdispatcharr\b/iu);
  add("karakeep-bookmarks", /\bkarakeep\b/iu);
  add("mealie-today", /\bmealie\b/iu);
  add("romm-library", /\bromm\b/iu);
  add("tubearchivist-queue", /\b(?:tube\s*archivist|tubearchivist)\b/iu);
  if (/\bfrigate\b/iu.test(text)) {
    add("frigate-live-streams", /\b(?:live|streams?)\b/iu);
    add("frigate-alerts", /\b(?:review|alerts?)\b/iu);
    add("frigate-system", /\b(?:system|metrics?|stats?|health)\b/iu);
  }
  return candidates
    .toSorted((left, right) => left.index - right.index)
    .map(({ id }) => id)
    .filter((id, index, ids) => ids.indexOf(id) === index);
};

export const isFreshCustomWidgetCreationRequest = (messages: readonly UIMessage[]) =>
  hasCustomWidgetFreshCreationIntent(getLatestUserText(messages));

export const hasMultiCustomWidgetCreationRequest = (messages: readonly UIMessage[]) => {
  const text = getLatestUserText(messages);
  return /\b(?:multiple|several|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:custom[\s-]+)?widgets?\b|\b(?:custom[\s-]+)?widgets\b/iu.test(
    text,
  );
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
  if (isCustomWidgetGuidanceRequest(getLatestUserText(messages))) return false;
  const latestUserMessage = messages.findLast((message) => message.role === "user");
  if (latestUserMessage && hasExplicitCustomWidgetIntent(latestUserMessage)) return true;
  return hasRecentCustomWidgetLifecycleContext(messages);
};
