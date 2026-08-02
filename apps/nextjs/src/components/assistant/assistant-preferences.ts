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

export const resolveAssistantThreadPreferenceModelId = ({
  isRemote,
  metadataLoaded,
  threadModelId,
  defaultModelId,
  models,
}: {
  isRemote: boolean;
  metadataLoaded: boolean;
  threadModelId: unknown;
  defaultModelId: string | null;
  models: readonly AssistantRuntimeModelOption[];
}) => {
  if (isRemote && !metadataLoaded) return undefined;
  if (typeof threadModelId === "string" && models.some((model) => model.id === threadModelId)) return threadModelId;
  return defaultModelId;
};
