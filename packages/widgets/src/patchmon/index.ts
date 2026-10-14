import { createWidgetDefinition } from "../definition";
import { definition as canonicalDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "patchmon",
  canonicalDefinition,
).withDynamicImport(() => import("./component"));
