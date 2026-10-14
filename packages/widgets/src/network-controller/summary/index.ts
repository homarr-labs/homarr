import { createWidgetDefinition } from "../../definition";
import { definition as canonicalDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "networkControllerSummary",
  canonicalDefinition,
).withDynamicImport(() => import("./component"));
