"use client";

import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { AUDIO_STATS_TRANSLATION_SCOPE, getGridCols, getIconSize, getVisibleStats } from "./shared";
import { AudioStatsContentView } from "./native-view-content";
import type { AudioStatsContentViewProps } from "./native-view-content";

export function AudioStatsContent(
  props: Omit<
    AudioStatsContentViewProps,
    "t" | "zoomCompensatedSize" | "getGridCols" | "getIconSize" | "getVisibleStats"
  >,
) {
  const t = useI18n(AUDIO_STATS_TRANSLATION_SCOPE);
  return (
    <AudioStatsContentView
      {...props}
      t={t}
      zoomCompensatedSize={zoomCompensatedSize}
      getGridCols={getGridCols}
      getIconSize={getIconSize}
      getVisibleStats={getVisibleStats}
    />
  );
}
