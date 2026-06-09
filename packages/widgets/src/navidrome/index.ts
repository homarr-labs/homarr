import { IconMusic, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("navidrome", {
  icon: IconMusic,
  supportedIntegrations: ["navidrome"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showArtists: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showAlbums: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showSongs: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showNowPlaying: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showNowPlayingList: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      maxNowPlayingItems: factory.number({
        defaultValue: 3,
        validate: z.number().min(1).max(5),
        step: 1,
        withDescription: true,
      }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.navidrome.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
