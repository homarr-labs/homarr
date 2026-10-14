import { createWidgetDefinition } from "../../definition";
import { definition as entityStateDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "smartHome-entityState",
  entityStateDefinition,
).withDynamicImport(() => import("./component"));
