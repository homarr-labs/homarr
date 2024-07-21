import { IconVideo } from "@tabler/icons-react";

import { z } from "@homarr/validation";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition, serverDataLoader } = createWidgetDefinition("hardwareUsage", {
  icon: IconVideo,
  supportedIntegrations: ["getDashDot"],
  options: optionsBuilder.from((factory) => ({})),
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
