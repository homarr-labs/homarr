import { createWidgetDefinition } from "../definition";
import { definition as wudDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition("wud", wudDefinition).withDynamicImport(
  () => import("./component"),
);
