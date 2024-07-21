import {IconVideo} from "@tabler/icons-react";

import {createWidgetDefinition} from "../definition";
import {optionsBuilder} from "../options";
import {z} from "@homarr/validation";

export const {componentLoader, definition, serverDataLoader} = createWidgetDefinition("hardwareUsage", {
  icon: IconVideo,
  supportedIntegrations: ["getDashDot"],
  options: optionsBuilder.from((factory) => ({})),
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
