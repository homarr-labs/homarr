import { IconGraphFilled } from "@tabler/icons-react";
import {createWidgetDefinition} from "../definition";

export const { definition, comonentsLoader } = createWidgetDefinition("systemResources", {
  icon: IconGraphFilled,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  }
}).withDynamicImport(() => import("./component"));