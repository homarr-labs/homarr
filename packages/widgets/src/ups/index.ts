import { createWidgetDefinition } from "../definition";
import { definition as canonicalDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition("ups", canonicalDefinition).withDynamicImport(
  () => import("./component"),
);
