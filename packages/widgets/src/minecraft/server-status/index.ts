import { createWidgetDefinition } from "../../definition";
import { definition as canonicalDefinition } from "./definition";

export const { componentLoader, definition } = createWidgetDefinition(
  "minecraftServerStatus",
  canonicalDefinition,
).withDynamicImport(() => import("./component"));
