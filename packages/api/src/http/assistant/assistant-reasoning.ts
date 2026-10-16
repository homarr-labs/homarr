import type { AssistantProvider, AssistantReasoningMode } from "@homarr/definitions";

const customWidgetReasoningModelId = "openai/gpt-5.6-luna";
const homarrProviderModelId = "homarr/model";
const maxReasoningModelIds = new Set([
  "deepseek/deepseek-v4.1-flash",
  "deepseek/deepseek-v4-flash-latest",
  "~deepseek/deepseek-v4-flash-latest",
]);

const getOptimizedCustomWidgetReasoning = ({
  customWidgetAuthoringActive,
  modelId,
  provider,
}: {
  customWidgetAuthoringActive: boolean;
  modelId: string;
  provider: AssistantProvider;
}) => {
  if (!customWidgetAuthoringActive) return undefined;
  if (modelId === customWidgetReasoningModelId) return "high" as const;
  if (provider === "homarr" && modelId === homarrProviderModelId) return "xhigh" as const;
  if (provider === "openrouter" && maxReasoningModelIds.has(modelId)) return "xhigh" as const;
  return undefined;
};

export const resolveAssistantReasoning = ({
  reasoning,
  customWidgetAuthoringActive,
  modelId,
  provider,
}: {
  reasoning: AssistantReasoningMode;
  customWidgetAuthoringActive: boolean;
  modelId: string;
  provider: AssistantProvider;
}): Exclude<AssistantReasoningMode, "auto"> | "xhigh" | undefined => {
  if (reasoning !== "auto") return reasoning;
  return getOptimizedCustomWidgetReasoning({ customWidgetAuthoringActive, modelId, provider });
};

export const resolveAssistantTemperature = ({
  customWidgetAuthoringActive,
  modelId,
  provider,
}: {
  customWidgetAuthoringActive: boolean;
  modelId: string;
  provider: AssistantProvider;
}) => {
  if (getOptimizedCustomWidgetReasoning({ customWidgetAuthoringActive, modelId, provider })) return 0.2;
  return undefined;
};
