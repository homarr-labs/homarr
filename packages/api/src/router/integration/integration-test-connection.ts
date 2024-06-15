import type { Integration } from "@homarr/db/schema/sqlite";
import type { IntegrationKind, IntegrationSecretKind } from "@homarr/definitions";
import { getAllSecretKindOptions } from "@homarr/definitions";
import { integrationFactory, IntegrationTestConnectionError } from "@homarr/integrations";

import { decryptSecret } from "./integration-router";

type FormIntegration = Integration & {
  secrets: {
    kind: IntegrationSecretKind;
    value: string | null;
  }[];
};

export const testConnectionAsync = async (
  integration: FormIntegration,
  dbSecrets: {
    kind: IntegrationSecretKind;
    value: `${string}.${string}`;
  }[] = [],
) => {
  const formSecrets = integration.secrets
    .filter((secret) => secret.value !== null)
    .map((secret) => ({
      ...secret,
      // Will never be null because of the check above, also will no longer be necessary in typescript 5.5
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      value: secret.value!,
      source: "form" as const,
    }));

  const decryptedDbSecrets = dbSecrets.map((secret) => ({
    ...secret,
    value: decryptSecret(secret.value),
    source: "db" as const,
  }));

  const sourcedSecrets = [...formSecrets, ...decryptedDbSecrets];
  const secretKinds = getSecretKindOption(integration.kind, sourcedSecrets);

  const filteredSecrets = sourcedSecrets.filter((secret) => secretKinds.includes(secret.kind));

  const integrationInstance = integrationFactory(integration.kind, {
    id: integration.id,
    name: integration.name,
    url: integration.url,
    decryptedSecrets: filteredSecrets,
  });

  await integrationInstance.testConnectionAsync();
};

interface SourcedIntegrationSecret {
  kind: IntegrationSecretKind;
  value: string;
  source: "db" | "form";
}

const getSecretKindOption = (kind: IntegrationKind, sourcedSecrets: SourcedIntegrationSecret[]) => {
  const matchingSecretKindOptions = getAllSecretKindOptions(kind).filter((secretKinds) =>
    sourcedSecrets.every((secret) => secretKinds.includes(secret.kind)),
  );

  if (matchingSecretKindOptions.length === 0) {
    throw new IntegrationTestConnectionError("secretNotDefined");
  }

  if (matchingSecretKindOptions.length === 1) {
    // Will never be undefined because of the check above
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return matchingSecretKindOptions[0]!;
  }

  const onlyFormSecretsKindOptions = matchingSecretKindOptions.filter((secretKinds) =>
    sourcedSecrets.filter((secret) => secretKinds.includes(secret.kind)).every((secret) => secret.source === "form"),
  );

  if (onlyFormSecretsKindOptions.length >= 1) {
    // Will never be undefined because of the check above
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return onlyFormSecretsKindOptions[0]!;
  }

  // Will never be undefined because of the check above
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return matchingSecretKindOptions[0]!;
};
