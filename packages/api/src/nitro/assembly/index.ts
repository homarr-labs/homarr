import { createCustomWidgetProcedures } from "../routers/custom-widget";
import { createIntegrationManagementProcedures } from "../routers/integration";
import { createIntegrationOperationsProcedures } from "../routers/integration-operations";
import { createWidgetProcedures } from "../routers/widgets";
import type {
  CustomWidgetProcedureResources,
  IntegrationManagementResources,
  IntegrationOperationsResources,
  WidgetProcedureResources,
} from "./resources";

export interface ExpansionApiAssemblyResources {
  readonly management: IntegrationManagementResources;
  readonly operations: IntegrationOperationsResources;
  readonly widgets: WidgetProcedureResources;
  readonly customWidget: CustomWidgetProcedureResources;
}

export function createExpansionApiAssembly(resources: ExpansionApiAssemblyResources) {
  return {
    integration: {
      ...createIntegrationManagementProcedures(resources.management),
      ...createIntegrationOperationsProcedures(resources.operations),
    },
    widget: createWidgetProcedures(resources.widgets),
    customWidget: createCustomWidgetProcedures(resources.customWidget),
  };
}
