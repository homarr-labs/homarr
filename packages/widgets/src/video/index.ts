import { createWidgetDefinition } from "../definition";
import { definition as videoDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition("video", videoDefinition).withDynamicImport(
  () => import("./component"),
);
