"use client";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { AudioStatsContent } from "../audio-stats/audio-stats-content";
import type { NavidromeDisplayOptions } from "../audio-stats/shared";

const defaultNavidromeOptions: NavidromeDisplayOptions = {
  showArtists: true,
  showAlbums: true,
  showSongs: true,
  showNowPlaying: true,
  showNowPlayingList: true,
  maxNowPlayingItems: 3,
};

export default function NavidromeWidget({ integrationIds, options, width }: WidgetComponentProps<"navidrome">) {
  const [stats] = clientApi.widget.navidrome.getStats.useSuspenseQuery({
    integrationId: integrationIds[0] ?? "",
  });

  const displayOptions = { ...defaultNavidromeOptions, ...options };

  return (
    <AudioStatsContent
      backend="navidrome"
      stats={stats}
      options={displayOptions}
      width={width}
      translationScope="navidrome"
    />
  );
}
