import { createWidgetDefinition } from "../definition";
import { definition as canonicalDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "systemResources",
  canonicalDefinition,
).withDynamicImport(() => import("./component"));

export type LabelDisplayModeOption = ReturnType<
  (typeof definition)["createOptions"]
>["labelDisplayMode"]["options"][number]["value"];
