import { createWidgetDefinition } from "../definition";
import { definition as weatherDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition("weather", weatherDefinition).withDynamicImport(
  () => import("./component"),
);
