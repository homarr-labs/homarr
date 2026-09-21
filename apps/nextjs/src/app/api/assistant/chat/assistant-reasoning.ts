import type { AssistantProvider, AssistantReasoningMode } from "@homarr/definitions";

const customWidgetReasoningModelId = "openai/gpt-5.6-luna";
const homarrProviderModelId = "homarr/model";

const usesOptimizedCustomWidgetModel = ({
  customWidgetAuthoringActive,
  modelId,
  provider,
}: {
  customWidgetAuthoringActive: boolean;
  modelId: string;
  provider: AssistantProvider;
}) => {
  if (!customWidgetAuthoringActive) return false;
  if (modelId === customWidgetReasoningModelId) return true;
  return provider === "homarr" && modelId === homarrProviderModelId;
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
  if (usesOptimizedCustomWidgetModel({ customWidgetAuthoringActive, modelId, provider })) return "high";
  return undefined;
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
  if (usesOptimizedCustomWidgetModel({ customWidgetAuthoringActive, modelId, provider })) return 0.2;
  return undefined;
};
