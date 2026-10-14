import { createWidgetDefinition } from "../definition";
import { definition as llamaCppDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition("llamacpp", llamaCppDefinition).withDynamicImport(
  () => import("./component"),
);
