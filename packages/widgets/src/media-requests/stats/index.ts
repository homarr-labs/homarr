import { createWidgetDefinition } from "../../definition";
import { definition as canonicalDefinition } from "./definition";

export const { componentLoader, definition } = createWidgetDefinition(
  "mediaRequests-requestStats",
  canonicalDefinition,
).withDynamicImport(() => import("./component"));
