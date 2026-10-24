import { IconRobot } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("assistant", {
  icon: IconRobot,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
})
  .withData({ mode: "browser", reason: "Chat depends on the active browser conversation." })
  .withDynamicImport(() => import("./component"));

export { AssistantWidgetRendererProvider } from "./context";
