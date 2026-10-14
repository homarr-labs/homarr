import { createWidgetDefinition } from "../definition";
import { definition as wazuhSummaryDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "wazuhSummary",
  wazuhSummaryDefinition,
).withDynamicImport(() => import("./component"));
