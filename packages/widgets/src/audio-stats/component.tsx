"use client";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { AudioStatsContent } from "./audio-stats-content";
import type { AudioStatsDisplayOptions } from "./shared";

const defaultDisplayOptions: AudioStatsDisplayOptions = {
  showArtists: true,
  showAlbums: true,
  showSongs: true,
  showNowPlaying: true,
  showNowPlayingList: true,
  maxNowPlayingItems: 3,
  showLibraryCount: true,
  showAudiobooks: true,
  showPodcasts: true,
  showListeningTime: true,
  showActiveSessions: true,
  compactMode: false,
};

export default function AudioStatsWidget({ integrationIds, options, width }: WidgetComponentProps<"audioStats">) {
  const [response] = clientApi.widget.audioStats.getStats.useSuspenseQuery({
    integrationId: integrationIds[0] ?? "",
  });

  const displayOptions = { ...defaultDisplayOptions, ...options };

  return (
    <AudioStatsContent
      backend={response.kind}
      stats={response.data}
      options={displayOptions}
      width={width}
      translationScope="audioStats"
    />
  );
}
