import { createWidgetDefinition } from "../definition";
import { definition as canonicalDefinition } from "./definition";

export const { componentLoader, definition } = createWidgetDefinition(
  "notifications",
  canonicalDefinition,
).withDynamicImport(() => import("./component"));
