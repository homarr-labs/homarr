import { createWidgetDefinition } from "../definition";
import { definition as rawDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition("airQuality", rawDefinition).withDynamicImport(
  () => import("./component"),
);
