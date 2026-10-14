import { createWidgetDefinition } from "../definition";
import { definition as rawDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition("countdown", rawDefinition).withDynamicImport(
  () => import("./component"),
);
