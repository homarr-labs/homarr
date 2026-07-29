import { IconHeadphones, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

const hideUnlessNavidrome = {
  shouldHide: (_: unknown, integrationKinds: string[]) => !integrationKinds.includes("navidrome"),
};

const hideUnlessAudiobookshelf = {
  shouldHide: (_: unknown, integrationKinds: string[]) => !integrationKinds.includes("audiobookshelf"),
};

export const { definition, componentLoader } = createWidgetDefinition("audioStats", {
  icon: IconHeadphones,
  supportedIntegrations: ["navidrome", "audiobookshelf"],
  integrationsRequired: true,
  maxIntegrations: 1,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        showArtists: factory.switch({ defaultValue: true, withDescription: true }),
        showAlbums: factory.switch({ defaultValue: true, withDescription: true }),
        showSongs: factory.switch({ defaultValue: true, withDescription: true }),
        showNowPlaying: factory.switch({ defaultValue: true, withDescription: true }),
        showNowPlayingList: factory.switch({ defaultValue: true, withDescription: true }),
        maxNowPlayingItems: factory.number({
          defaultValue: 3,
          validate: z.number().min(1).max(5),
          step: 1,
          withDescription: true,
        }),
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
        showNowPlaying: hideUnlessNavidrome,
        showNowPlayingList: hideUnlessNavidrome,
        maxNowPlayingItems: hideUnlessNavidrome,
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
