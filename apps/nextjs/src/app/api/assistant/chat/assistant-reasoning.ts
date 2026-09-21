import type { AssistantProvider, AssistantReasoningMode } from "@homarr/definitions";

const customWidgetReasoningModelId = "openai/gpt-5.6-luna";
const homarrProviderModelId = "homarr/model";

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
  if (provider === "homarr" && modelId === homarrProviderModelId) return "high" as const;
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
}): Exclude<AssistantReasoningMode, "auto"> | undefined => {
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
