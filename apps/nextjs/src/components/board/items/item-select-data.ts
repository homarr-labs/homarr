import type { IntegrationKind } from "@homarr/definitions";

export type WidgetConnectionStatus = "ready" | "needsSetup" | "noConnectionRequired";

export const getWidgetConnectionStatus = ({
  supportedIntegrations,
  availableKinds,
  connectionOptional,
}: {
  supportedIntegrations: readonly IntegrationKind[];
  availableKinds: ReadonlySet<IntegrationKind>;
  connectionOptional: boolean;
}): WidgetConnectionStatus => {
  if (supportedIntegrations.some((kind) => availableKinds.has(kind))) return "ready";
  if (supportedIntegrations.length === 0 || connectionOptional) return "noConnectionRequired";
  return "needsSetup";
};

export const tryLockSelection = (lock: { current: boolean }) => {
  if (lock.current) return false;
  lock.current = true;
  return true;
};

export const unlockSelection = (lock: { current: boolean }) => {
  lock.current = false;
};

export const resolveMatchingIntegrationsAsync = async <
  TIntegration extends { kind: IntegrationKind; permissions?: { hasUseAccess: boolean } },
>({
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
  return integrations.filter(
    (integration) =>
      integration.permissions?.hasUseAccess !== false && supportedIntegrations.includes(integration.kind),
  );
};
