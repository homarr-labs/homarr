import { decryptSecret } from "@homarr/common";
import type { Integration } from "@homarr/db/schema/sqlite";
import type { IntegrationKind, IntegrationSecretKind } from "@homarr/definitions";
import { getAllSecretKindOptions } from "@homarr/definitions";
import { integrationCreatorByKind, IntegrationTestConnectionError } from "@homarr/integrations";

import type { integrationCreators } from "../../../../integrations/src/base/creator";

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
      // We ensured above that the value is not null
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

  const filteredSecrets = secretKinds.map((kind) => {
    const secrets = sourcedSecrets.filter((secret) => secret.kind === kind);
    // Will never be undefined because of the check before
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (secrets.length === 1) return secrets[0]!;

    // There will always be a matching secret because of the getSecretKindOption function
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return secrets.find((secret) => secret.source === "form") ?? secrets[0]!;
  });

  // @ts-expect-error - For now we expect an error here as not all integerations have been implemented
  const integrationInstance = integrationCreatorByKind(integration.kind, {
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
    secretKinds.every((kind) => sourcedSecrets.some((secret) => secret.kind === kind)),
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
