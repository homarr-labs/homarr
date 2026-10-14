import { createWidgetDefinition } from "../definition";
import { definition as canonicalDefinition } from "./definition";

export { views } from "./views";

export const { componentLoader, definition } = createWidgetDefinition(
  "mediaTranscoding",
  canonicalDefinition,
).withDynamicImport(() => import("./component"));
