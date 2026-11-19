import { IconRobot } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("assistant", {
  deferUntilVisible: true,
  icon: IconRobot,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
}).withDynamicImport(() => import("./component"));

export { AssistantWidgetRendererProvider } from "./context";
