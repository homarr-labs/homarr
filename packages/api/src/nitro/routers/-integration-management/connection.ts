import type { EncryptedSecret } from "@homarr/auth/nitro/policy";
import { getAllSecretKindOptions, getOptionalSecretKinds } from "@homarr/definitions";
import type { IntegrationKind, IntegrationSecretKind } from "@homarr/definitions";

import type { IntegrationManagementResources, IntegrationManagementSnapshot } from "./resources";

export class MissingIntegrationSecretError extends Error {
  constructor() {
    super("No secret defined for this integration");
    this.name = "MissingIntegrationSecretError";
  }
}

export interface ConnectionForm {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly kind: IntegrationKind;
  readonly secrets: readonly { readonly kind: IntegrationSecretKind; readonly value: string | null }[];
}

interface SourcedSecret {
  readonly kind: IntegrationSecretKind;
  readonly value: string;
  readonly source: "db" | "form";
}

function getSecretKindOption(kind: IntegrationKind, secrets: readonly SourcedSecret[]) {
  const matching = getAllSecretKindOptions(kind).filter((kinds) =>
    kinds.every((candidate) => secrets.some((secret) => secret.kind === candidate)),
  );
  if (matching.length === 0) throw new MissingIntegrationSecretError();
  const first = matching[0];
  if (!first) throw new MissingIntegrationSecretError();
  if (matching.length === 1) return first;
  const formOnly = matching.filter((kinds) =>
    kinds.every((candidate) => secrets.some((secret) => secret.kind === candidate && secret.source === "form")),
  );
  if (formOnly.length >= 2 && formOnly.some((kinds) => kinds.length === 0))
    return formOnly.find((kinds) => kinds.length >= 1) ?? formOnly[0] ?? first;
  return formOnly[0] ?? first;
}

export async function resolveConnectionSecretsAsync(
  resources: Pick<IntegrationManagementResources, "codec" | "logger">,
  snapshot: IntegrationManagementSnapshot,
  signal: AbortSignal,
  integration: ConnectionForm,
  stored: readonly { readonly kind: IntegrationSecretKind; readonly value: EncryptedSecret }[],
) {
  await snapshot.assertCurrentAsync();
  signal.throwIfAborted();
  const dbSecrets = stored.flatMap((secret): SourcedSecret[] => {
    try {
      return [{ ...secret, value: resources.codec.decryptSecret(secret.value), source: "db" }];
    } catch {
      resources.logger.warn("Failed to decrypt secret from database", {
        integrationName: integration.name,
        integrationKind: integration.kind,
        secretKind: secret.kind,
      });
      return [];
    }
  });
  const formSecrets = integration.secrets
    .map((secret) => ({
      ...secret,
      value: secret.value ?? dbSecrets.find((candidate) => candidate.kind === secret.kind)?.value ?? null,
      source: "form" as const,
    }))
    .filter((secret): secret is SourcedSecret & { source: "form" } => secret.value !== null);
  const sourced = [...formSecrets, ...dbSecrets];
  const required = getSecretKindOption(integration.kind, sourced);
  const optional = getOptionalSecretKinds(integration.kind).filter(
    (kind) => !required.includes(kind) && sourced.some((secret) => secret.kind === kind),
  );
  return [...required, ...optional].map((kind) => {
    const candidates = sourced.filter((secret) => secret.kind === kind);
    const selected =
      candidates.length === 1
        ? candidates[0]
        : (candidates.find((secret) => secret.source === "form") ?? candidates[0]);
    if (!selected) throw new MissingIntegrationSecretError();
    return { kind: selected.kind, value: selected.value };
  });
}

export async function testManagementConnectionAsync(
  resources: IntegrationManagementResources,
  snapshot: IntegrationManagementSnapshot,
  signal: AbortSignal,
  integration: ConnectionForm,
  stored: readonly { readonly kind: IntegrationSecretKind; readonly value: EncryptedSecret }[] = [],
) {
  const metadata = { integrationName: integration.name, integrationKind: integration.kind };
  resources.logger.info("Testing connection", metadata);
  signal.throwIfAborted();
  const decryptedSecrets = await resolveConnectionSecretsAsync(resources, snapshot, signal, integration, stored);
  signal.throwIfAborted();
  await snapshot.assertCurrentAsync();
  const lease = await resources.acquireNativeClientAsync(
    {
      id: integration.id,
      name: integration.name,
      url: integration.url,
      kind: integration.kind,
      externalUrl: null,
      decryptedSecrets,
    },
    { signal, assertCurrentAsync: () => snapshot.assertCurrentAsync() },
  );
  try {
    signal.throwIfAborted();
    await snapshot.assertCurrentAsync();
    signal.throwIfAborted();
    const result = await lease.client.testConnectionAsync();
    await snapshot.assertCurrentAsync();
    signal.throwIfAborted();
    if (result.success) resources.logger.info("Tested connection successfully", metadata);
    return result;
  } finally {
    await lease.releaseAsync();
  }
}
