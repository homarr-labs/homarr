import { decryptSecret } from "@homarr/common/server";
import type { Integration } from "@homarr/db/schema";
import type { IntegrationKind, IntegrationSecretKind } from "@homarr/definitions";
import { getAllSecretKindOptions } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import { logger } from "@homarr/log";

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
  logger.info("Testing connection", {
    integrationName: integration.name,
    integrationKind: integration.kind,
    integrationUrl: integration.url,
  });

  const formSecrets = integration.secrets
    .filter((secret) => secret.value !== null)
    .map((secret) => ({
      ...secret,
      // We ensured above that the value is not null
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      value: secret.value!,
      source: "form" as const,
    }));

  const decryptedDbSecrets = dbSecrets
    .map((secret) => {
      try {
        return {
          ...secret,
          value: decryptSecret(secret.value),
          source: "db" as const,
        };
      } catch (error) {
        logger.warn(
          new Error(
            `Failed to decrypt secret from database integration="${integration.name}" secretKind="${secret.kind}"`,
            { cause: error },
          ),
        );
        return null;
      }
    })
    .filter((secret) => secret !== null);

  const sourcedSecrets = [...formSecrets, ...decryptedDbSecrets];
  const secretKinds = getSecretKindOption(integration.kind, sourcedSecrets);

  const decryptedSecrets = secretKinds
    .map((kind) => {
      const secrets = sourcedSecrets.filter((secret) => secret.kind === kind);
      // Will never be undefined because of the check before
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (secrets.length === 1) return secrets[0]!;

      // There will always be a matching secret because of the getSecretKindOption function
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return secrets.find((secret) => secret.source === "form") ?? secrets[0]!;
    })
    .map(({ source: _, ...secret }) => secret);

  const { secrets: _, ...baseIntegration } = integration;

  const integrationInstance = await createIntegrationAsync({
    ...baseIntegration,
    decryptedSecrets,
  });

  const result = await integrationInstance.testConnectionAsync();
  if (result.success) {
    logger.info("Tested connection successfully", {
      integrationName: integration.name,
      integrationKind: integration.kind,
      integrationUrl: integration.url,
    });
  }
  return result;
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
    throw new MissingSecretError();
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
    // If the first option is no secret it would always be selected even if we want to have a secret
    if (
      onlyFormSecretsKindOptions.length >= 2 &&
      onlyFormSecretsKindOptions.some((secretKinds) => secretKinds.length === 0)
    ) {
      return (
        // Will never be undefined because of the check above
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        onlyFormSecretsKindOptions.find((secretKinds) => secretKinds.length >= 1) ?? onlyFormSecretsKindOptions[0]!
      );
    }

    // Will never be undefined because of the check above
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return onlyFormSecretsKindOptions[0]!;
  }

  // Will never be undefined because of the check above
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return matchingSecretKindOptions[0]!;
};

export class MissingSecretError extends Error {
  constructor() {
    super("No secret defined for this integration");
  }
}
