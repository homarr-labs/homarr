import { createWidgetDefinition } from "../definition";
import { definition as canonicalDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "wazuhTimeline",
  canonicalDefinition,
).withDynamicImport(() => import("./component"));
