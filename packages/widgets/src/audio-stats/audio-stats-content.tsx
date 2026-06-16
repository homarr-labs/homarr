"use client";

import type { CSSProperties } from "react";
import { Badge, Text } from "@mantine/core";
import { IconHeadphones } from "@tabler/icons-react";

import type { AudiobookshelfDashboardData, NavidromeDashboardData } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import classes from "./component.module.css";
import type { AudioStatsBackend, AudioStatsDisplayOptions } from "./shared";
import { AUDIO_STATS_TRANSLATION_SCOPE, getGridCols, getIconSize, getVisibleStats } from "./shared";

const rootClassByCompact = {
  true: classes.rootCompact,
  false: "",
} as const;

const gridClassByCompact = {
  true: classes.gridCompact,
  false: "",
} as const;

const statTileClassByCompact = {
  true: classes.statTileCompact,
  false: "",
} as const;

interface AudioStatsContentProps {
  backend: AudioStatsBackend;
  stats: NavidromeDashboardData | AudiobookshelfDashboardData;
  options: AudioStatsDisplayOptions;
  width: number;
}

export function AudioStatsContent({ backend, stats, options, width }: AudioStatsContentProps) {
  const t = useScopedI18n(AUDIO_STATS_TRANSLATION_SCOPE);
  const visibleStats = getVisibleStats(backend, options, stats);
  const compactKey = String(options.compactMode ?? false) as keyof typeof rootClassByCompact;
  const gridCols = getGridCols(width, visibleStats.length, options.compactMode ?? false);
  const iconSize = getIconSize(width, options.compactMode ?? false);

  const navidromeStatsByBackend: Record<AudioStatsBackend, NavidromeDashboardData | null> = {
    navidrome: stats as NavidromeDashboardData,
    audiobookshelf: null,
  };
  const navidromeStats = navidromeStatsByBackend[backend];
  const showNowPlayingSection =
    navidromeStats !== null && Boolean(options.showNowPlaying) && navidromeStats.nowPlaying.length > 0;

  const nowPlayingLimitByListVisibility = {
    true: options.maxNowPlayingItems ?? 3,
    false: 0,
  } as const;

  const nowPlayingTracks =
    navidromeStats?.nowPlaying.slice(
      0,
      nowPlayingLimitByListVisibility[
        String(options.showNowPlayingList) as keyof typeof nowPlayingLimitByListVisibility
      ],
    ) ?? [];

  const hasContent = visibleStats.length > 0 || showNowPlayingSection;

  return (
    <div className={`${classes.root} ${rootClassByCompact[compactKey]}`}>
      {visibleStats.length > 0 && (
        <div
          className={`${classes.grid} ${gridClassByCompact[compactKey]}`}
          style={{ "--stat-cols": gridCols } as CSSProperties}
        >
          {visibleStats.map(({ optionKey, statKey, value, Icon }) => (
            <div key={optionKey} className={`${classes.statTile} ${statTileClassByCompact[compactKey]}`}>
              <Icon className={classes.statIcon} size={iconSize} stroke={1.5} />
              <span className={classes.statValue}>{value}</span>
              <span className={classes.statLabel}>{t(statKey as never)}</span>
            </div>
          ))}
        </div>
      )}

      {showNowPlayingSection && navidromeStats && (
        <div className={classes.nowPlaying}>
          <div className={classes.nowPlayingHeader}>
            <IconHeadphones size={iconSize} stroke={1.5} />
            <span className={classes.nowPlayingTitle}>{t("nowPlaying" as never)}</span>
            {!options.showNowPlayingList && (
              <Badge className={classes.nowPlayingCount} variant="light" size="sm">
                {(t as unknown as (key: string, params?: { count: number }) => string)("nowPlayingCount", {
                  count: navidromeStats.nowPlaying.length,
                })}
              </Badge>
            )}
          </div>
          {options.showNowPlayingList && (
            <div className={classes.nowPlayingList}>
              {nowPlayingTracks.map((track, index) => (
                <div key={`${track.username}-${track.title}-${index}`} className={classes.nowPlayingItem}>
                  <div className={classes.trackInfo}>
                    <span className={classes.trackTitle}>{track.title}</span>
                    <span className={classes.trackArtist}>
                      {[track.artist, track.album].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <Badge className={classes.trackUser} variant="outline" size="xs">
                    {track.username || track.playerName}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasContent && (
        <div className={classes.emptyState}>
          <Text size="sm" c="dimmed">
            —
          </Text>
        </div>
      )}
    </div>
  );
}
