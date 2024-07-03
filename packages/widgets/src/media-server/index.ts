import { IconVideo } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";

export const { componentLoader, definition, serverDataLoader } = createWidgetDefinition("mediaServer", {
  icon: IconVideo,
  options: {},
  supportedIntegrations: ["jellyfin"],
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
