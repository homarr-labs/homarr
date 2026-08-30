import type { UIMessage } from "ai";

import { getCustomWidgetPhaseToolNames } from "@homarr/custom-widgets/core";

export { getCustomWidgetPhaseToolNames };

const customWidgetIntentPattern =
  /(?:\bcustom\s+jsx\b|\bhomarr-custom-widget-v\d+\b|\b(?:build|create|design|edit|fix|make|repair|update|validate)\b[^\n]{0,80}\bcustom[\s-]+widgets?\b|\b(?:build|create|design|make)\b[^\n]{0,80}\bwidgets?\s+(?:for|using|with)\b|\b(?:i|we)\s+(?:need|want)\b[^\n]{0,60}\bwidgets?\s+(?:for|using|with)\b)/iu;

const customWidgetBootstrapToolNames = new Set(["customWidget_getSkill"]);
const maxFocusedComponentSearchesPerPhase = 4;
const customWidgetContextToolBudgets: Readonly<Record<string, number>> = {
  customWidget_findComponents: maxFocusedComponentSearchesPerPhase,
  customWidget_getComponents: 1,
  customWidget_getComponent: 2,
  customWidget_getSharedProps: 1,
  customWidget_getExample: 1,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

const hasExplicitCustomWidgetIntent = (message: UIMessage) =>
  message.role === "user" &&
  message.parts.some(
    (part) =>
      isRecord(part) &&
      part.type === "text" &&
      typeof part.text === "string" &&
      customWidgetIntentPattern.test(part.text),
  );

export const needsCustomWidgetAuthoringContext = (messages: UIMessage[]) => {
  const latestMessage = messages.at(-1);
  if (!latestMessage) return false;
  if (hasExplicitCustomWidgetIntent(latestMessage)) return true;
  if (latestMessage.role === "assistant") return hasCustomWidgetToolPart(latestMessage);

  const precedingAssistantMessage = messages
    .slice(0, -1)
    .toReversed()
    .find((message) => message.role === "assistant");
  return precedingAssistantMessage !== undefined && hasCustomWidgetToolPart(precedingAssistantMessage);
};

export const getActiveCustomWidgetToolNames = <TToolName extends string>(
  availableToolNames: readonly TToolName[],
  messages: UIMessage[],
  isAdmin: boolean,
) => {
  if (!isAdmin || !needsCustomWidgetAuthoringContext(messages)) return [];
  return availableToolNames.filter((toolName) => customWidgetBootstrapToolNames.has(toolName));
};
