import { createWidgetDefinition } from "../definition";
import { definition as canonicalDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "downloads",
  canonicalDefinition,
).withDynamicImport(() => import("./component"));
