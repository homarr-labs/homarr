import { createWidgetDefinition } from "../definition";
import { definition as canonicalDefinition } from "./definition";

export { timeFrameValues } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition("umami", canonicalDefinition).withDynamicImport(
  () => import("./component"),
);
