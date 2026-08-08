interface AssistantConnectionStateInput {
  connectionConfigured: boolean;
  destinationChanged: boolean;
  providerRequiresApiKey: boolean;
  apiKeyConfigured: boolean;
}

export const getAssistantConnectionState = ({
  connectionConfigured,
  destinationChanged,
  providerRequiresApiKey,
  apiKeyConfigured,
}: AssistantConnectionStateInput) => {
  const hasStoredApiKey = apiKeyConfigured && !destinationChanged;
  const credentialsMissing = providerRequiresApiKey && !hasStoredApiKey;
  const connectionPending = !connectionConfigured || destinationChanged || credentialsMissing;

  return {
    hasStoredApiKey,
    connectionPending,
    connectionReady: !connectionPending,
  };
};
