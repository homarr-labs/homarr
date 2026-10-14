import { createWidgetDefinition } from "../../definition";
import { definition as canonicalDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "immich-serverStats",
  canonicalDefinition,
).withDynamicImport(() => import("./component"));
