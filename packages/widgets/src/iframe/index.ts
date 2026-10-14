import { createWidgetDefinition } from "../definition";
import { definition as iframeDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition("iframe", iframeDefinition).withDynamicImport(
  () => import("./component"),
);
