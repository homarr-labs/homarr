import type * as operators from "@homarr/db";
import type { HomarrDatabase } from "@homarr/db/driver";
import type * as tables from "@homarr/db/schema";
import type { CertificateTrustMaterial } from "@homarr/core/infrastructure/certificates/resources";
import type { IntegrationKind } from "@homarr/definitions";

import type { IntegrationInput } from "../base/integration";
import type { IntegrationAuthority, IntegrationConfiguration } from "../runtime/contracts";
import { IntegrationBindingError, requireIntegrationProducer } from "./errors";
import type { IntegrationProducer } from "./errors";

export interface SavedIntegrationSqlSnapshot {
  readonly db: HomarrDatabase;
  readonly tables: Pick<typeof tables, "integrations">;
  readonly operators: Pick<typeof operators, "eq">;
  assertCurrentAsync(): Promise<void>;
  releaseAsync(): Promise<void>;
}

export interface IntegrationCredentialCodec {
  encryptSecret(value: string): `${string}.${string}`;
  decryptSecret(value: `${string}.${string}`): string;
  fingerprint(value: string): string;
  verifyFingerprint(value: string, fingerprint: string): boolean;
}

export interface SavedIntegrationSecretGuard {
  assertCurrentAsync(): Promise<void>;
}

type SecretResolutionScope =
  | { readonly kind: "native" }
  | { readonly kind: "saved-operation"; readonly guard: SavedIntegrationSecretGuard };

export interface SavedIntegrationResources<TPrincipal> {
  readonly sql: IntegrationProducer<{
    acquireSnapshotAsync(signal: AbortSignal): Promise<SavedIntegrationSqlSnapshot>;
    readConfigurationRevisionAsync(
      snapshot: SavedIntegrationSqlSnapshot,
      integrationId: string,
      signal: AbortSignal,
    ): Promise<string>;
  }>;
  readonly codec: IntegrationProducer<IntegrationCredentialCodec>;
  readonly trust: IntegrationProducer<{
    readTrustMaterialAsync(signal: AbortSignal): Promise<CertificateTrustMaterial>;
  }>;
  readonly authority: IntegrationProducer<{
    authorizeAsync(
      principal: TPrincipal,
      integration: IntegrationConfiguration,
      authority: IntegrationAuthority,
      signal: AbortSignal,
    ): Promise<void>;
  }>;
}

const sameConfiguration = (left: IntegrationConfiguration, right: IntegrationConfiguration) =>
  left.id === right.id &&
  left.kind === right.kind &&
  left.name === right.name &&
  left.url === right.url &&
  left.externalUrl === right.externalUrl &&
  left.configurationIdentity === right.configurationIdentity &&
  left.trustIdentity === right.trustIdentity;

export const createSavedIntegrationBindings = <TPrincipal>(resources: SavedIntegrationResources<TPrincipal>) => {
  const readAsync = async (integrationId: string, signal: AbortSignal, externalUrl?: string | null) => {
    signal.throwIfAborted();
    const sql = requireIntegrationProducer(resources.sql, "saved-sql-snapshot");
    const codec = requireIntegrationProducer(resources.codec, "credential-codec");
    const trust = requireIntegrationProducer(resources.trust, "trusted-material");
    const snapshot = await sql.acquireSnapshotAsync(signal);
    let outcome:
      | {
          readonly kind: "success";
          readonly value: {
            readonly configuration: IntegrationConfiguration;
            readonly secrets: Pick<typeof tables.integrationSecrets.$inferSelect, "kind" | "value">[];
          };
        }
      | { readonly kind: "failure"; readonly error: unknown };
    try {
      signal.throwIfAborted();
      await snapshot.assertCurrentAsync();
      const row = await snapshot.db.query.integrations.findFirst({
        where: snapshot.operators.eq(snapshot.tables.integrations.id, integrationId),
        with: { secrets: true, app: true },
      });
      if (!row) throw new IntegrationBindingError("stale");
      if (externalUrl !== undefined && externalUrl !== null && externalUrl !== (row.app?.href ?? null)) {
        throw new IntegrationBindingError("stale", row.kind);
      }
      const revision = await sql.readConfigurationRevisionAsync(snapshot, integrationId, signal);
      if (!revision) throw new IntegrationBindingError("saved-sql-snapshot");
      const material = await trust.readTrustMaterialAsync(signal);
      if (!material.version) throw new IntegrationBindingError("trusted-material");
      await snapshot.assertCurrentAsync();
      signal.throwIfAborted();
      const secrets = row.secrets.map(({ kind, value }) => ({ kind, value }));
      const configuration: IntegrationConfiguration = {
        id: row.id,
        kind: row.kind,
        name: row.name,
        url: row.url,
        externalUrl: externalUrl === undefined ? (row.app?.href ?? null) : externalUrl,
        configurationIdentity: codec.fingerprint(
          JSON.stringify({
            revision,
            id: row.id,
            kind: row.kind,
            name: row.name,
            url: row.url,
            externalUrl: row.app?.href ?? null,
            secrets: secrets.toSorted(
              (left, right) => left.kind.localeCompare(right.kind) || left.value.localeCompare(right.value),
            ),
          }),
        ),
        trustIdentity: material.version,
      };
      outcome = { kind: "success", value: { configuration, secrets } };
    } catch (error) {
      outcome = { kind: "failure", error };
    }
    let releaseFailure: { readonly error: unknown } | undefined;
    try {
      await snapshot.releaseAsync();
    } catch (error) {
      releaseFailure = { error };
    }
    if (outcome.kind === "failure") {
      if (releaseFailure) {
        throw new AggregateError(
          [outcome.error, releaseFailure.error],
          "Saved integration snapshot and release failed",
          {
            cause: outcome.error,
          },
        );
      }
      throw outcome.error;
    }
    if (releaseFailure) throw releaseFailure.error;
    return outcome.value;
  };

  const isCurrentAsync = async (configuration: IntegrationConfiguration, signal: AbortSignal) => {
    try {
      return sameConfiguration(
        configuration,
        (await readAsync(configuration.id, signal, configuration.externalUrl)).configuration,
      );
    } catch (error) {
      if (error instanceof IntegrationBindingError && error.resource === "stale") return false;
      throw error;
    }
  };

  const assertCurrentAsync = async (configuration: IntegrationConfiguration, signal: AbortSignal) => {
    if (!(await isCurrentAsync(configuration, signal))) throw new IntegrationBindingError("stale", configuration.kind);
    signal.throwIfAborted();
  };

  const resolveSecretsAsync = async (
    integration: IntegrationConfiguration,
    signal: AbortSignal,
    scope: SecretResolutionScope,
  ): Promise<IntegrationInput["decryptedSecrets"]> => {
    const saved = await readAsync(integration.id, signal, integration.externalUrl);
    if (!sameConfiguration(integration, saved.configuration))
      throw new IntegrationBindingError("stale", integration.kind);
    const codec = requireIntegrationProducer(resources.codec, "credential-codec");
    if (scope.kind === "saved-operation") await scope.guard.assertCurrentAsync();
    signal.throwIfAborted();
    const secrets = saved.secrets.map(({ kind, value }) => ({ kind, value: codec.decryptSecret(value) }));
    await assertCurrentAsync(integration, signal);
    if (scope.kind === "saved-operation") await scope.guard.assertCurrentAsync();
    signal.throwIfAborted();
    return secrets;
  };

  return {
    async captureConfigurationAsync(
      snapshot: { assertCurrentAsync(): Promise<void> },
      integration: { readonly id: string; readonly name: string; readonly kind: IntegrationKind; readonly url: string },
      externalUrl: string | null,
      signal: AbortSignal,
    ): Promise<IntegrationConfiguration> {
      await snapshot.assertCurrentAsync();
      const { configuration } = await readAsync(integration.id, signal, externalUrl);
      if (
        configuration.name !== integration.name ||
        configuration.kind !== integration.kind ||
        configuration.url !== integration.url ||
        configuration.externalUrl !== externalUrl
      )
        throw new IntegrationBindingError("stale", integration.kind);
      await snapshot.assertCurrentAsync();
      signal.throwIfAborted();
      return configuration;
    },
    assertCurrentAsync,
    resolveSecretsAsync(
      integration: IntegrationConfiguration,
      signal: AbortSignal,
      guard: SavedIntegrationSecretGuard,
    ) {
      return resolveSecretsAsync(integration, signal, { kind: "saved-operation", guard });
    },
    policy: {
      async authorizeAsync(
        principal: TPrincipal,
        integration: IntegrationConfiguration,
        authority: IntegrationAuthority,
        signal: AbortSignal,
      ) {
        signal.throwIfAborted();
        await requireIntegrationProducer(resources.authority, "native-authority").authorizeAsync(
          principal,
          integration,
          authority,
          signal,
        );
        signal.throwIfAborted();
      },
      resolveSecretsAsync(integration: IntegrationConfiguration, signal: AbortSignal) {
        return resolveSecretsAsync(integration, signal, { kind: "native" });
      },
      isCurrentAsync,
    },
  };
};
