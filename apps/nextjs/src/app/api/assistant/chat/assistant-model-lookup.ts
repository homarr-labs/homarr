export type AssistantModelLookupStatus = "available" | "unavailable" | "unreachable";

export const getAssistantModelLookupStatus = ({
  configuredModelId,
  requestedModelId,
  hasModel,
  failed,
}: {
  configuredModelId: string;
  requestedModelId: string;
  hasModel: boolean;
  failed: boolean;
}): AssistantModelLookupStatus => {
  if (requestedModelId === configuredModelId) return "available";
  if (failed) return "unreachable";
  return hasModel ? "available" : "unavailable";
};
