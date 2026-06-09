import { IconHeadphones, IconServerOff } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("audiobookshelf", {
  icon: IconHeadphones,
  supportedIntegrations: ["audiobookshelf"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showLibraryCount: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showAudiobooks: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showPodcasts: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showListeningTime: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showActiveSessions: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      compactMode: factory.switch({
        defaultValue: false,
        withDescription: true,
      }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.audiobookshelf.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
