"use client";

import type { CSSProperties } from "react";
import { Text } from "@mantine/core";

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

      {visibleStats.length === 0 && (
        <div className={classes.emptyState}>
          <Text size="sm" c="dimmed">
            —
          </Text>
        </div>
      )}
    </div>
  );
}
