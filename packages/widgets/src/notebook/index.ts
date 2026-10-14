import { createWidgetDefinition } from "../definition";
import { definition as notebookDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition("notebook", notebookDefinition).withDynamicImport(
  () => import("./component"),
);
