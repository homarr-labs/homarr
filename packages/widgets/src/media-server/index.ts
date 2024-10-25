import { IconVideo } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";

export const { componentLoader, definition } = createWidgetDefinition("mediaServer", {
  icon: IconVideo,
  options: {},
  supportedIntegrations: ["jellyfin", "plex"],
}).withDynamicImport(() => import("./component"));
