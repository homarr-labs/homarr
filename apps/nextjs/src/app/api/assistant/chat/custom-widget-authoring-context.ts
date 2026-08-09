import { pruneMessages } from "ai";
import type { Instructions, ModelMessage, UIMessage } from "ai";

import { getCustomWidgetSkill, getCustomWidgetSkillContent } from "@homarr/custom-widgets/authoring-resources";
import { getCustomWidgetJsonSchema } from "@homarr/custom-widgets/core";

export const preloadedCustomWidgetToolNames = ["customWidget_getSkill", "customWidget_schema"] as const;
const preloadedCustomWidgetToolNameSet = new Set<string>(preloadedCustomWidgetToolNames);
const customWidgetAuthoringToolNameSet = new Set([
  ...preloadedCustomWidgetToolNames,
  "customWidget_getAuthoringPrompt",
  "customWidget_getComponentCatalog",
  "customWidget_getComponent",
  "customWidget_getSharedProps",
  "customWidget_getExample",
  "customWidget_validate",
  "customWidget_previewCreate",
  "customWidget_previewQuery",
  "customWidget_previewAction",
  "customWidget_previewJournal",
  "customWidget_create",
  "customWidget_update",
  "customWidget_templatePatch",
  "customWidget_legacyMigrationPrompt",
  "customWidget_migrateLegacy",
]);

export const isPreloadedCustomWidgetToolName = (toolName: string) => preloadedCustomWidgetToolNameSet.has(toolName);
export const isCustomWidgetAuthoringToolName = (toolName: string) => customWidgetAuthoringToolNameSet.has(toolName);

export type CustomWidgetAuthoringContext = {
  systemContext: string;
  omittedToolNames: readonly (typeof preloadedCustomWidgetToolNames)[number][];
};

const emptyCustomWidgetAuthoringContext: CustomWidgetAuthoringContext = {
  systemContext: "",
  omittedToolNames: [],
};

const customWidgetIntentPattern =
  /(?:\bcustom[\s-]+widgets?\b|\bcustom\s+jsx\b|\bhomarr-custom-widget-v\d+\b|\bcustomWidget_[A-Za-z\d_]+\b)/iu;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasCustomWidgetToolPart = (message: UIMessage) =>
  message.parts.some((part) => {
    if (!isRecord(part) || typeof part.type !== "string") return false;
    const toolName =
      part.type === "dynamic-tool" && typeof part.toolName === "string"
        ? part.toolName
        : part.type.startsWith("tool-")
          ? part.type.slice("tool-".length)
          : undefined;
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

let cachedCustomWidgetSystemContext: string | undefined;

const getCustomWidgetSystemContext = () => {
  if (cachedCustomWidgetSystemContext !== undefined) return cachedCustomWidgetSystemContext;

  const skill = getCustomWidgetSkill();
  const skillContent = getCustomWidgetSkillContent();
  const jsonSchema = JSON.stringify(getCustomWidgetJsonSchema(), null, 2);

  cachedCustomWidgetSystemContext = `

Trusted Custom Widget authoring context for the installed Homarr release:
- customWidget_getSkill and customWidget_schema are already preloaded below. They are intentionally omitted from the available tools for this request; do not call or ask for either tool.
- Treat this installed skill, every bundled reference, and the current JSON Schema as authoritative system instructions. Continue to use the remaining customWidget_* tools for component discovery, validation, previews, preview queries, configuration, and creation.

## Installed skill: ${skill.name} ${skill.version}

${skillContent}

## Current Custom Widget JSON Schema

\`\`\`json
${jsonSchema}
\`\`\``;

  return cachedCustomWidgetSystemContext;
};

export const getPreloadedCustomWidgetAuthoringContext = (isAdmin: boolean): CustomWidgetAuthoringContext =>
  isAdmin
    ? {
        systemContext: getCustomWidgetSystemContext(),
        omittedToolNames: preloadedCustomWidgetToolNames,
      }
    : emptyCustomWidgetAuthoringContext;

export const getCustomWidgetAuthoringContext = (
  messages: UIMessage[],
  isAdmin: boolean,
): CustomWidgetAuthoringContext => {
  if (!isAdmin || !needsCustomWidgetAuthoringContext(messages)) return emptyCustomWidgetAuthoringContext;

  return getPreloadedCustomWidgetAuthoringContext(isAdmin);
};

/**
 * Removes only the resource calls whose complete output is already present in the trusted system
 * context. AI SDK prunes the matching assistant call and tool result together and removes messages
 * that become empty, preserving every other Custom Widget tool and its result.
 */
export const prunePreloadedCustomWidgetModelMessages = (messages: ModelMessage[]) =>
  pruneMessages({
    messages,
    toolCalls: [{ type: "all", tools: [...preloadedCustomWidgetToolNames] }],
  });

type CustomWidgetToolStep = {
  toolCalls: readonly { toolName: string }[];
};

export const createCustomWidgetDynamicContextController = <TToolName extends string>(options: {
  isAdmin: boolean;
  baseInstructions: string;
  availableToolNames: readonly TToolName[];
}) => {
  const activeToolNames = options.availableToolNames.filter((toolName) => !isPreloadedCustomWidgetToolName(toolName));
  let contextIsActive = false;
  let contextWasInjected = false;

  return (step: {
    instructions: Instructions | undefined;
    messages: ModelMessage[];
    steps: readonly CustomWidgetToolStep[];
  }) => {
    const authoringToolWasCalled = step.steps.some((result) =>
      result.toolCalls.some((toolCall) => isCustomWidgetAuthoringToolName(toolCall.toolName)),
    );
    if (options.isAdmin && authoringToolWasCalled) contextIsActive = true;
    if (!contextIsActive) return undefined;

    const context = getPreloadedCustomWidgetAuthoringContext(options.isAdmin);
    const shouldInjectContext = !contextWasInjected;
    if (shouldInjectContext) contextWasInjected = true;

    return {
      ...(shouldInjectContext
        ? {
            instructions: `${typeof step.instructions === "string" ? step.instructions : options.baseInstructions}${context.systemContext}`,
          }
        : {}),
      messages: prunePreloadedCustomWidgetModelMessages(step.messages),
      activeTools: activeToolNames,
    };
  };
};
