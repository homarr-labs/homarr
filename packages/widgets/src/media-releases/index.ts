import { IconTicket } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("mediaReleases", {
  icon: IconTicket,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      layout: factory.select({
        defaultValue: "backdrop",
        options: ["backdrop", "poster"],
      }),
      showType: factory.switch({
        defaultValue: true,
      }),
      showSource: factory.switch({
        defaultValue: true,
      }),
    }));
  },
  // supportedIntegrations: ["plex", "jellyfin", "emby", "lidarr", "radarr", "readarr", "sonarr"],
}).withDynamicImport(() => import("./component"));
