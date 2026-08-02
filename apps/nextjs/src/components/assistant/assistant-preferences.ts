export type { AssistantReasoningMode } from "@homarr/definitions";

export type AssistantRuntimeModelOption = {
  id: string;
  name: string;
  inputModalities: string[];
};

export const resolveAssistantPreferenceModelId = ({
  currentModelId,
  previousDefaultModelId,
  defaultModelId,
  models,
}: {
  currentModelId: string | null;
  previousDefaultModelId: string | null | undefined;
  defaultModelId: string | null;
  models: readonly AssistantRuntimeModelOption[];
}) => {
  if (previousDefaultModelId !== defaultModelId) return defaultModelId;
  if (currentModelId && models.some((model) => model.id === currentModelId)) return currentModelId;
  return defaultModelId;
};
