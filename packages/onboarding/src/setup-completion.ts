export interface SetupCompletionApp {
  sourceId: string;
  name: string;
  selected: boolean;
  url: string;
}

export interface SetupCompletionIntegration {
  name: string;
  url: string;
  secrets: { value: string }[];
}

export type SetupCompletionBlock =
  | { kind: "app-address"; sourceId: string; name: string }
  | { kind: "integration"; name: string }
  | { kind: "server-address" };

const missingValue = (value: string) => value.trim().length === 0;

export const findIncompleteSetupConnection = (
  apps: SetupCompletionApp[],
  integrations: SetupCompletionIntegration[],
): Extract<SetupCompletionBlock, { kind: "app-address" | "integration" }> | null => {
  const app = apps.find((candidate) => candidate.selected && missingValue(candidate.url));
  if (app) return { kind: "app-address", sourceId: app.sourceId, name: app.name };
  const integration = integrations.find(
    (candidate) => missingValue(candidate.url) || candidate.secrets.some((secret) => missingValue(secret.value)),
  );
  if (integration) return { kind: "integration", name: integration.name };
  return null;
};

export const getSetupCompletionBlock = ({
  hasSelectedServices,
  serverAddressReviewed,
  apps,
  integrations,
}: {
  hasSelectedServices: boolean;
  serverAddressReviewed: boolean;
  apps: SetupCompletionApp[];
  integrations: SetupCompletionIntegration[];
}): SetupCompletionBlock | null =>
  findIncompleteSetupConnection(apps, integrations) ??
  (hasSelectedServices && !serverAddressReviewed ? { kind: "server-address" } : null);

export const discoveredAppUrlInputId = (sourceId: string) => `discovered-app-url-${sourceId}`;
