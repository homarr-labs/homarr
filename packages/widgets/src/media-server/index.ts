import { IconVideo } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";

export const { componentLoader, definition } = createWidgetDefinition("mediaServer", {
  icon: IconVideo,
  createOptions() {
    return {};
  },
  supportedIntegrations: ["jellyfin", "plex", "emby"],
}).withDynamicImport(() => import("./component"));
