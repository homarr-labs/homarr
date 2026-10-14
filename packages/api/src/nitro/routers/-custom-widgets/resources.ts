import type { PolicyIdentity, SecretCodec } from "@homarr/auth/nitro/policy";
import type { CustomWidgetSource } from "@homarr/custom-widgets/core";
import type { PreviewSessionStore, RequestLimitStore } from "@homarr/custom-widgets/server";
import type {
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
} from "@homarr/core/infrastructure/certificates";
import type { createCustomCheckServerIdentity } from "@homarr/core/infrastructure/http";
import type * as operators from "@homarr/db";
import type * as tables from "@homarr/db/schema";
import type { getIntegrationHttpAuthenticationAsync } from "@homarr/integrations/factory";
import type { WorkshopBackend } from "@homarr/workshop/backend";

import type { AuthenticatedBackendContext } from "../../context";

export interface CustomWidgetAuthorityLease {
  readonly db: AuthenticatedBackendContext["db"];
  readonly principal: AuthenticatedBackendContext["principal"];
  readonly identity: Extract<PolicyIdentity, { type: "authenticated" }>;
  releaseAsync(): Promise<void>;
}

export type CustomWidgetProcedureContext = AuthenticatedBackendContext & {
  readonly customWidgetAuthority: CustomWidgetAuthorityLease;
};

export interface CustomWidgetConfigurationRequest {
  id: string;
  userId: string;
  target: { type: "definition"; id: string } | { type: "preview"; id: string };
  widgetName: string;
  sourceId: string;
  sourceName: string;
  source: CustomWidgetSource;
  kinds: ("apiKey" | "username" | "password")[];
  expiresAt: number;
  status: "pending" | "applying" | "completed";
}

export interface CustomWidgetProcedureResources {
  readonly tables: Pick<
    typeof tables,
    | "customWidgetDefinitions"
    | "customWidgetSecrets"
    | "legacyCustomWidgetDefinitions"
    | "boards"
    | "boardUserPermissions"
    | "boardGroupPermissions"
    | "groupMembers"
    | "integrations"
    | "integrationUserPermissions"
    | "integrationGroupPermissions"
  >;
  readonly operators: Pick<
    typeof operators,
    "and" | "eq" | "or" | "inArray" | "notInArray" | "handleTransactionsAsync"
  >;
  readonly codec: Pick<SecretCodec, "encryptSecret" | "decryptSecret">;
  readonly previewStore: PreviewSessionStore;
  readonly requestLimitStore: RequestLimitStore;
  readonly configurationStore: {
    save(request: CustomWidgetConfigurationRequest, ttlMs: number): Promise<void>;
    get(id: string): Promise<CustomWidgetConfigurationRequest | null>;
    delete(id: string): Promise<void>;
  };
  readonly workshop: Pick<WorkshopBackend, "get" | "list">;
  readonly workshopWebUrl: string;
  readonly integration: {
    getAuthenticationAsync: typeof getIntegrationHttpAuthenticationAsync;
  };
  readonly certificates: {
    getAllTrustedCertificatesAsync: typeof getAllTrustedCertificatesAsync;
    getTrustedCertificateHostnamesAsync: typeof getTrustedCertificateHostnamesAsync;
    createCustomCheckServerIdentity: typeof createCustomCheckServerIdentity;
  };
  readonly logger: {
    info(message: string, metadata: Readonly<Record<string, unknown>>): void;
    warn(message: string, metadata: Readonly<Record<string, unknown>>): void;
    error(message: string, metadata: Readonly<Record<string, unknown>>): void;
  };
  acquireAuthorityAsync(context: AuthenticatedBackendContext): Promise<CustomWidgetAuthorityLease>;
}
