import { IconHeadphones, IconServerOff } from "@tabler/icons-react";

import { createWidgetDefinition, matchesWidgetRuntimeQuery } from "../definition";
import { optionsBuilder } from "../options";

const hideUnlessNavidrome = {
  shouldHide: (_: unknown, integrationKinds: string[]) =>
    !integrationKinds.includes("navidrome") && !integrationKinds.includes("mock"),
};

const hideUnlessAudiobookshelf = {
  shouldHide: (_: unknown, integrationKinds: string[]) => !integrationKinds.includes("audiobookshelf"),
};

export const { definition, componentLoader } = createWidgetDefinition("audioStats", {
  icon: IconHeadphones,
  supportsAdvancedFocus: true,
  queryKeys: [[["widget", "audioStats", "getStats"]], [["widget", "mediaServer", "getCurrentStreams"]]],
  queryMatcher: matchesWidgetRuntimeQuery,
  supportedIntegrations: ["navidrome", "audiobookshelf", "mock"],
  integrationsRequired: true,
  maxIntegrations: 1,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        showArtists: factory.switch({ defaultValue: true, withDescription: true }),
        showAlbums: factory.switch({ defaultValue: true, withDescription: true }),
        showSongs: factory.switch({ defaultValue: true, withDescription: true }),
        showLibraryCount: factory.switch({ defaultValue: true, withDescription: true }),
        showAudiobooks: factory.switch({ defaultValue: true, withDescription: true }),
        showPodcasts: factory.switch({ defaultValue: true, withDescription: true }),
        showListeningTime: factory.switch({ defaultValue: true, withDescription: true }),
        showActiveSessions: factory.switch({ defaultValue: true, withDescription: true }),
        compactMode: factory.switch({ defaultValue: false, withDescription: true }),
      }),
      {
        showArtists: hideUnlessNavidrome,
        showAlbums: hideUnlessNavidrome,
        showSongs: hideUnlessNavidrome,
        showLibraryCount: hideUnlessAudiobookshelf,
        showAudiobooks: hideUnlessAudiobookshelf,
        showPodcasts: hideUnlessAudiobookshelf,
        showListeningTime: hideUnlessAudiobookshelf,
        showActiveSessions: hideUnlessAudiobookshelf,
      },
    );
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.audioStats.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
