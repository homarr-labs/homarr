import { stockPriceTimeFrames } from "@homarr/definitions/stock-price";

import { createWidgetDefinition } from "../definition";
import { definition as stockPriceDefinition } from "./definition";

export { stockPriceTimeFrames };

export const { definition, componentLoader } = createWidgetDefinition(
  "stockPrice",
  stockPriceDefinition,
).withDynamicImport(() => import("./component"));
