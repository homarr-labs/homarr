import { IconVideo } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("mediaServer", {
  icon: IconVideo,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showOnlyPlaying: factory.switch({ defaultValue: true, withDescription: true }),
    }));
  },
  supportedIntegrations: ["jellyfin", "plex", "emby"],
}).withDynamicImport(() => import("./component"));
