export const hasStaleIntegrationData = (isRefetchError: boolean, failedResults: readonly unknown[]) =>
  isRefetchError || failedResults.length > 0;
