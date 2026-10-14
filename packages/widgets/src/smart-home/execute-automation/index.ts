import { createWidgetDefinition } from "../../definition";
import { definition as executeAutomationDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "smartHome-executeAutomation",
  executeAutomationDefinition,
).withDynamicImport(() => import("./component"));
