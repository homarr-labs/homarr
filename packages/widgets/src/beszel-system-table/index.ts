import { createWidgetDefinition } from "../definition";
import { definition as canonicalDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "beszelSystemTable",
  canonicalDefinition,
).withDynamicImport(() => import("./component"));
