import { createWidgetDefinition } from "../../definition";
import { definition as canonicalDefinition } from "./definition";

export const { componentLoader, definition } = createWidgetDefinition(
  "mediaRequests-requestList",
  canonicalDefinition,
).withDynamicImport(() => import("./component"));
