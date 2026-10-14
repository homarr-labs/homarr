import { createWidgetDefinition } from "../definition";
import { definition as wazuhAgentsDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "wazuhAgents",
  wazuhAgentsDefinition,
).withDynamicImport(() => import("./component"));
