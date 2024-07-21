import { IconVideo } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("hardwareUsage", {
  icon: IconVideo,
  supportedIntegrations: ["getDashDot"],
  options: optionsBuilder.from(() => ({})),
}).withDynamicImport(() => import("./component"));
