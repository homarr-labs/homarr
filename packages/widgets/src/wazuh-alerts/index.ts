import { createWidgetDefinition } from "../definition";
import { definition as wazuhAlertsDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "wazuhAlerts",
  wazuhAlertsDefinition,
).withDynamicImport(() => import("./component"));
