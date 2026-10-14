import type { SecretCodec, ResourceAuthorizationRepository } from "@homarr/auth/nitro/policy";
import type * as operators from "@homarr/db";
import type * as tables from "@homarr/db/schema";
import type { CustomWidgetHttpRequest, executeCustomWidgetRequest } from "@homarr/custom-widgets/server";
import type { IntegrationKind } from "@homarr/definitions";
import type { IntegrationInput } from "@homarr/integrations";
import type { createIntegrationAsync } from "@homarr/integrations/factory";
import type {
  createIntegrationRuntime,
  IntegrationConfiguration,
  IntegrationRuntimeResources,
} from "@homarr/integrations/runtime";
import type { createIntegrationRequestRuntime } from "@homarr/request-handler/lib/integration-request-runtime";
import type { StateGenerations } from "@homarr/redis/state";

import type { BackendPrincipal, AuthenticatedBackendContext } from "../../context";
import type {
  IntegrationManagementResources,
  IntegrationManagementSnapshot,
} from "../-integration-management/resources";

export type IntegrationOperationsRuntime = ReturnType<typeof createIntegrationRuntime<BackendPrincipal>>;
type IntegrationRequestRuntime = ReturnType<typeof createIntegrationRequestRuntime>;

export interface IntegrationOperationsResources extends Omit<
  IntegrationManagementResources,
  "acquireNativeClientAsync" | "invalidateIntegrationCacheAsync"
> {
  readonly tables: IntegrationManagementResources["tables"] & Pick<typeof tables, "apps" | "integrationSecrets">;
  readonly operators: IntegrationManagementResources["operators"] & Pick<typeof operators, "and" | "or">;
  readonly codec: Pick<SecretCodec, "decryptSecret" | "encryptSecret">;
  readonly handleTransactionsAsync: typeof operators.handleTransactionsAsync;
  createId(): string;
  readonly writes:
    | { readonly kind: "unbound" }
    | {
        readonly kind: "candidate";
        readonly snapshots: Pick<IntegrationManagementResources, "acquireSnapshotAsync">;
      };
  readonly native: IntegrationOperationsRuntime;
  captureConfigurationAsync(
    snapshot: IntegrationManagementSnapshot,
    integration: { readonly id: string; readonly name: string; readonly kind: IntegrationKind; readonly url: string },
    externalUrl: string | null,
  ): Promise<IntegrationConfiguration>;
  getAuthorizationRepository(snapshot: IntegrationManagementSnapshot): ResourceAuthorizationRepository;
  readonly testing: {
    readonly createIntegrationAsync: typeof createIntegrationAsync;
    acquireResourcesAsync(
      snapshot: IntegrationManagementSnapshot,
      input: IntegrationInput & { kind: IntegrationKind },
      signal: AbortSignal,
    ): Promise<{ readonly runtime: IntegrationRuntimeResources; releaseAsync(): Promise<void> }>;
  };
  readonly http:
    | { readonly kind: "unbound" }
    | {
        readonly kind: "candidate";
        readonly executeCustomWidgetRequest: typeof executeCustomWidgetRequest;
        getTlsOptionsAsync(
          snapshot: IntegrationManagementSnapshot,
          signal: AbortSignal,
        ): Promise<CustomWidgetHttpRequest["tls"]>;
      };
  readonly mediaRequestList: Pick<
    ReturnType<IntegrationRequestRuntime["createIntegrationRequestHandler"]>,
    "invalidateCache"
  >;
  readonly mediaRequestStats: Pick<
    ReturnType<IntegrationRequestRuntime["createIntegrationRequestHandler"]>,
    "invalidateCacheAsync"
  >;
  readonly cacheGenerations: Pick<StateGenerations, "invalidateIntegrationCacheAsync">;
  readonly clock: { now(): number };
  readonly executionTimeoutMs: number;
  readonly logger: IntegrationManagementResources["logger"] & {
    debug(message: string, metadata: Readonly<Record<string, unknown>>): void;
    warn(message: string, metadata: Readonly<Record<string, unknown>>): void;
    error(message: string, metadata: Readonly<Record<string, unknown>>): void;
  };
}
