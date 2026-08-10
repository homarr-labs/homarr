import type { IntegrationKind } from "@homarr/definitions";

export const tryLockSelection = (lock: { current: boolean }) => {
  if (lock.current) return false;
  lock.current = true;
  return true;
};

export const unlockSelection = (lock: { current: boolean }) => {
  lock.current = false;
};

export const resolveMatchingIntegrationsAsync = async <TIntegration extends { kind: IntegrationKind }>({
  hasIntegrationSupport,
  supportedIntegrations,
  currentData,
  ensureDataAsync,
}: {
  hasIntegrationSupport: boolean;
  supportedIntegrations: readonly IntegrationKind[];
  currentData: TIntegration[] | undefined;
  ensureDataAsync: () => Promise<TIntegration[]>;
}) => {
  if (!hasIntegrationSupport) return [];

  const integrations = currentData ?? (await ensureDataAsync());
  return integrations.filter((integration) => supportedIntegrations.includes(integration.kind));
};
