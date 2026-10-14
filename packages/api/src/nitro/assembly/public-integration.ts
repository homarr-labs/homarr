import { createIntegrationManagementProcedures } from "../routers/integration";
import type { IntegrationManagementResources } from "./resources";

export function createPublicIntegrationCatalogAssembly(resources: IntegrationManagementResources) {
  const integration = createIntegrationManagementProcedures(resources);
  return { integration: { getKinds: integration.getKinds } };
}
