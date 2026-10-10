import { Buffer } from "node:buffer";

import type { IntegrationSecretKind, integrationSecretKindObject } from "@homarr/definitions/integration";

import { assertAuthorized, enforceMutationMode, requireAuthenticated } from "./identity";
import type { MutationMode, PolicyIdentity } from "./identity";
import { authorizeIntegrations } from "./resources";
import type {
  IntegrationAccessEvidence,
  IntegrationAction,
  IntegrationSelection,
  ResourceAuthorizationRepository,
} from "./resources";
import type { EncryptedSecret, SecretCodec } from "./crypto";

export type PublicJson =
  | string
  | number
  | boolean
  | null
  | readonly PublicJson[]
  | { readonly [key: string]: PublicJson };

export interface StoredIntegrationSecret {
  readonly kind: IntegrationSecretKind;
  readonly value: EncryptedSecret;
  readonly updatedAt: Date;
}

export interface IntegrationExecutionEvidence extends IntegrationAccessEvidence {
  readonly name: string;
  readonly url: string;
  readonly externalUrl: string | null;
  readonly secrets: readonly StoredIntegrationSecret[];
}

export interface IntegrationExecutionInput {
  readonly id: string;
  readonly kind: IntegrationAccessEvidence["kind"];
  readonly name: string;
  readonly url: string;
  readonly externalUrl: string | null;
  readonly decryptedSecrets: readonly { readonly kind: IntegrationSecretKind; readonly value: string }[];
}

interface IntegrationExecutionBaseOptions {
  readonly identity: PolicyIdentity;
  readonly mode: MutationMode;
  readonly selection: IntegrationSelection;
  readonly allowedKinds: readonly IntegrationAccessEvidence["kind"][];
}

export type IntegrationExecutionOptions = IntegrationExecutionBaseOptions &
  (
    | { readonly action: "query"; readonly operation: "query" | "mutation" }
    | { readonly action: "interact" | "full"; readonly operation: "mutation" }
  );

export class SecretExecutionError extends Error {
  constructor() {
    super("Integration execution failed");
    this.name = "SecretExecutionError";
  }
}

export function redactIntegrationResult(data: PublicJson, secretValues: readonly string[]): PublicJson {
  const sensitive = [
    ...new Set(
      secretValues
        .filter(Boolean)
        .flatMap((value) => [
          value,
          JSON.stringify(value).slice(1, -1),
          encodeURIComponent(value),
          Buffer.from(value).toString("base64"),
        ]),
    ),
  ].toSorted((left, right) => right.length - left.length);
  const redact = (value: string) => {
    for (const secret of sensitive) value = value.replaceAll(secret, "[REDACTED]");
    return value;
  };
  const visit = (value: PublicJson): PublicJson => {
    if (typeof value === "string") return redact(value);
    if (value === null || typeof value === "number" || typeof value === "boolean") {
      return redact(String(value)) === String(value) ? value : "[REDACTED]";
    }
    if (Array.isArray(value)) return value.map(visit);
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [redact(key), visit(child)]));
  };
  return visit(data);
}

export async function withAuthorizedIntegrations<TResult>(
  repository: ResourceAuthorizationRepository<IntegrationExecutionEvidence>,
  codec: SecretCodec,
  options: IntegrationExecutionOptions,
  execute: (integrations: readonly IntegrationExecutionInput[]) => Promise<TResult>,
  projectResult: (result: TResult) => PublicJson,
): Promise<PublicJson> {
  assertAuthorized(enforceMutationMode(options.mode, options.operation));
  if (options.action !== "query") assertAuthorized(enforceMutationMode(options.mode, "mutation"));
  if (options.action === "full") assertAuthorized(requireAuthenticated(options.identity));
  const authorized = await authorizeIntegrations(
    repository,
    options.identity,
    options.selection,
    options.action,
    options.allowedKinds,
  );
  assertAuthorized(authorized);
  try {
    const integrations = authorized.integrations.map((integration) => ({
      id: integration.id,
      kind: integration.kind,
      name: integration.name,
      url: integration.url,
      externalUrl: integration.externalUrl,
      decryptedSecrets: integration.secrets.map(({ kind, value }) => ({ kind, value: codec.decryptSecret(value) })),
    }));
    const secrets = integrations.flatMap(({ decryptedSecrets }) => {
      const values = decryptedSecrets.map(({ value }) => value);
      const username = decryptedSecrets.find(({ kind }) => kind === "username")?.value;
      const password = decryptedSecrets.find(({ kind }) => kind === "password")?.value;
      return username && password ? [...values, `${username}:${password}`] : values;
    });
    return redactIntegrationResult(projectResult(await execute(integrations)), secrets);
  } catch {
    throw new SecretExecutionError();
  }
}

export async function projectIntegrationSecrets(
  repository: ResourceAuthorizationRepository<IntegrationExecutionEvidence>,
  codec: SecretCodec,
  definitions: typeof integrationSecretKindObject,
  identity: PolicyIdentity,
  integrationId: string,
  allowedKinds: readonly IntegrationAccessEvidence["kind"][],
) {
  assertAuthorized(requireAuthenticated(identity));
  const authorized = await authorizeIntegrations(
    repository,
    identity,
    { cardinality: "one", integrationId },
    "full",
    allowedKinds,
  );
  assertAuthorized(authorized);
  const integration = authorized.integrations[0];
  if (!integration) throw new SecretExecutionError();
  try {
    return integration.secrets.map(({ kind, value, updatedAt }) => ({
      kind,
      value: definitions[kind].isPublic ? codec.decryptSecret(value) : null,
      updatedAt,
    }));
  } catch {
    throw new SecretExecutionError();
  }
}

export type SecretUpdate =
  | { readonly type: "retain"; readonly kind: IntegrationSecretKind; readonly value: EncryptedSecret }
  | { readonly type: "replace"; readonly kind: IntegrationSecretKind; readonly value: EncryptedSecret }
  | { readonly type: "clear"; readonly kind: IntegrationSecretKind };

export function planIntegrationSecretUpdates(
  codec: SecretCodec,
  existing: readonly StoredIntegrationSecret[],
  input: readonly { readonly kind: IntegrationSecretKind; readonly value: string | null }[],
): readonly SecretUpdate[] {
  return [
    ...input.flatMap((secret): SecretUpdate[] => {
      if (secret.value !== null)
        return [{ type: "replace", kind: secret.kind, value: codec.encryptSecret(secret.value) }];
      const previous = existing.find(({ kind }) => kind === secret.kind);
      return previous ? [{ type: "retain", kind: secret.kind, value: previous.value }] : [];
    }),
    ...existing
      .filter(({ kind }) => !input.some((secret) => secret.kind === kind))
      .map(({ kind }): SecretUpdate => ({ type: "clear", kind })),
  ];
}

export function integrationActionForExecution(
  operation: "native-query" | "native-interact" | "arbitrary-request",
): IntegrationAction {
  return operation === "arbitrary-request" ? "full" : operation === "native-query" ? "query" : "interact";
}
