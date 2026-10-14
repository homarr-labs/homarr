import { createWidgetDefinition } from "../definition";
import { definition as rawDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition("anchorNote", rawDefinition).withDynamicImport(
  () => import("./component"),
);
