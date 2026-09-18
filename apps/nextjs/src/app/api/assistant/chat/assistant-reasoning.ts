import type { AssistantReasoningMode } from "@homarr/definitions";

const customWidgetReasoningModelId = "z-ai/glm-5.3-flash";

export const resolveAssistantReasoning = ({
  reasoning,
  customWidgetAuthoringActive,
  modelId,
}: {
  reasoning: AssistantReasoningMode;
  customWidgetAuthoringActive: boolean;
  modelId: string;
}): Exclude<AssistantReasoningMode, "auto"> | undefined => {
  if (reasoning !== "auto") return reasoning;
  if (customWidgetAuthoringActive && modelId === customWidgetReasoningModelId) return "low";
  return undefined;
};
