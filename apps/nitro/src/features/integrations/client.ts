import type { RouterClient } from "@orpc/server";

import type { BackendPrincipal } from "@homarr/api/nitro";

import type { createIntegrationManagementProcedures } from "../../../../../packages/api/src/nitro/routers/integration";
import type { createIntegrationOperationsProcedures } from "../../../../../packages/api/src/nitro/routers/integration-operations";
import type { createCertificateProcedures } from "../../../../../packages/api/src/nitro/routers/certificates";
import type { createAppProcedures } from "../../../../../packages/api/src/nitro/routers/app";
import type { createUserProcedures } from "../../../../../packages/api/src/nitro/routers/user";
import type { createGroupProcedures } from "../../../../../packages/api/src/nitro/routers/group";

type Management = ReturnType<typeof createIntegrationManagementProcedures>;
type Operations = ReturnType<typeof createIntegrationOperationsProcedures>;

export interface IntegrationFeatureClient {
  integration: RouterClient<
    Pick<
      Management & Operations,
      | "all"
      | "byId"
      | "getKinds"
      | "testConnection"
      | "delete"
      | "create"
      | "update"
      | "getIntegrationPermissions"
      | "saveUserIntegrationPermissions"
      | "saveGroupIntegrationPermissions"
    >
  >;
  certificates: RouterClient<
    Pick<ReturnType<typeof createCertificateProcedures>, "addCertificate" | "trustHostnameMismatch">
  >;
  app: RouterClient<Pick<ReturnType<typeof createAppProcedures>, "selectable" | "create">>;
  user: RouterClient<Pick<ReturnType<typeof createUserProcedures>, "selectable">>;
  group: RouterClient<Pick<ReturnType<typeof createGroupProcedures>, "selectable">>;
}

export type IntegrationFeaturePrincipal = BackendPrincipal;
export type IntegrationListItem = Awaited<ReturnType<IntegrationFeatureClient["integration"]["all"]>>[number];
export type IntegrationDetail = Awaited<ReturnType<IntegrationFeatureClient["integration"]["byId"]>>;
export type IntegrationGrants = Awaited<
  ReturnType<IntegrationFeatureClient["integration"]["getIntegrationPermissions"]>
>;
export type CreateIntegrationInput = Parameters<IntegrationFeatureClient["integration"]["create"]>[0];
export type UpdateIntegrationInput = Parameters<IntegrationFeatureClient["integration"]["update"]>[0];
export type CreatedIntegration = Extract<
  Awaited<ReturnType<IntegrationFeatureClient["integration"]["create"]>>,
  { integration: unknown }
>;
export type ConnectionError = Extract<
  Awaited<ReturnType<IntegrationFeatureClient["integration"]["create"]>>,
  { error: unknown }
>["error"];
export type CertificateConnectionError = Extract<ConnectionError, { type: "certificate" }>;
export type Certificate = CertificateConnectionError["data"]["certificate"];
export type SelectableApp = Awaited<ReturnType<IntegrationFeatureClient["app"]["selectable"]>>[number];
