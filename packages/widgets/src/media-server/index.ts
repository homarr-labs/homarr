import { createWidgetDefinition } from "../definition";
import { definition as mediaServerDefinition } from "./definition";

export const { componentLoader, definition } = createWidgetDefinition(
  "mediaServer",
  mediaServerDefinition,
).withDynamicImport(() => import("./component"));
