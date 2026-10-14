import { createWidgetDefinition } from "../definition";
import { definition as canonicalDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "indexerManager",
  canonicalDefinition,
).withDynamicImport(() => import("./component"));
