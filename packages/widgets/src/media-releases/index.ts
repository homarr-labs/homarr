import { createWidgetDefinition } from "../definition";
import { definition as canonicalDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition(
  "mediaReleases",
  canonicalDefinition,
).withDynamicImport(() => import("./component"));
