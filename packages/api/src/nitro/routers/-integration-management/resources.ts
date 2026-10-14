import type { SecretCodec } from "@homarr/auth/nitro/policy";
import type * as operators from "@homarr/db";
import type * as tables from "@homarr/db/schema";
import type { IntegrationKind, IntegrationSecretKind } from "@homarr/definitions";
import type { IntegrationConnectionResult } from "@homarr/integrations/runtime";

import type { AuthenticatedBackendContext } from "../../context";

export interface IntegrationManagementSnapshot {
  readonly db: AuthenticatedBackendContext["db"];
  readonly principal: AuthenticatedBackendContext["principal"];
  assertCurrentAsync(): Promise<void>;
  releaseAsync(): Promise<void>;
}

export interface NativeConnectionInput {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly kind: IntegrationKind;
  readonly externalUrl: null;
  readonly decryptedSecrets: { kind: IntegrationSecretKind; value: string }[];
}

export interface NativeConnectionLease {
  readonly client: { testConnectionAsync(): Promise<IntegrationConnectionResult> };
  releaseAsync(): Promise<void>;
}

export interface IntegrationManagementResources {
  readonly tables: Pick<
    typeof tables,
    "integrations" | "groupMembers" | "groupPermissions" | "integrationUserPermissions" | "integrationGroupPermissions"
  >;
  readonly operators: Pick<typeof operators, "eq" | "inArray" | "asc" | "like">;
  readonly codec: Pick<SecretCodec, "decryptSecret">;
  acquireSnapshotAsync(context: AuthenticatedBackendContext): Promise<IntegrationManagementSnapshot>;
  acquireNativeClientAsync(
    input: NativeConnectionInput,
    scope: { readonly signal: AbortSignal; assertCurrentAsync(): Promise<void> },
  ): Promise<NativeConnectionLease>;
  invalidateIntegrationCacheAsync(integrationId: string): Promise<void>;
  readonly logger: {
    info(message: string, metadata: Readonly<Record<string, string>>): void;
    warn(message: string, metadata: Readonly<Record<string, string>>): void;
  };
}
