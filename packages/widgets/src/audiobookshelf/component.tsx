"use client";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { AudioStatsContent } from "../audio-stats/audio-stats-content";
import type { AudiobookshelfDisplayOptions } from "../audio-stats/shared";

const defaultAudiobookshelfOptions: AudiobookshelfDisplayOptions = {
  showLibraryCount: true,
  showAudiobooks: true,
  showPodcasts: true,
  showListeningTime: true,
  showActiveSessions: true,
  compactMode: false,
};

export default function AudiobookshelfWidget({
  integrationIds,
  options,
  width,
}: WidgetComponentProps<"audiobookshelf">) {
  const [stats] = clientApi.widget.audiobookshelf.getStats.useSuspenseQuery({
    integrationId: integrationIds[0] ?? "",
  });

  const displayOptions = { ...defaultAudiobookshelfOptions, ...options };

  return (
    <AudioStatsContent
      backend="audiobookshelf"
      stats={stats}
      options={displayOptions}
      width={width}
      translationScope="audiobookshelf"
    />
  );
}
