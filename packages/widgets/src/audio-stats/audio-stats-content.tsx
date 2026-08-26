"use client";

import type { CSSProperties } from "react";
import { Text } from "@mantine/core";

import type { AudiobookshelfDashboardData, NavidromeDashboardData } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

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

const statTileClassByAdvanced = {
  true: classes.statTileAdvanced,
  false: "",
} as const;

const COMPACT_SINGLE_COLUMN_BREAKPOINT = 220;

interface AudioStatsContentProps {
  backend: AudioStatsBackend;
  stats: NavidromeDashboardData | AudiobookshelfDashboardData;
  options: AudioStatsDisplayOptions;
  showAllStats?: boolean;
  advanced?: boolean;
  width: number;
}

export function AudioStatsContent({
  backend,
  stats,
  options,
  showAllStats = false,
  advanced = false,
  width,
}: AudioStatsContentProps) {
  const t = useI18n(AUDIO_STATS_TRANSLATION_SCOPE);
  const compact = options.compactMode ?? false;
  const visibleStats = getVisibleStats(backend, options, stats, showAllStats);
  const compactKey = String(compact) as keyof typeof rootClassByCompact;
  const advancedKey = String(advanced) as keyof typeof statTileClassByAdvanced;
  let gridCols = getGridCols(width, visibleStats.length, compact);
  if (!advanced && width < COMPACT_SINGLE_COLUMN_BREAKPOINT) {
    gridCols = 1;
  }
  const iconSize = getIconSize(width, compact);

  return (
    <div className={`${classes.root} ${rootClassByCompact[compactKey]}`}>
      {visibleStats.length > 0 && (
        <div
          className={`${classes.grid} ${gridClassByCompact[compactKey]}`}
          style={{ "--stat-cols": gridCols } as CSSProperties}
        >
          {visibleStats.map(({ optionKey, statKey, value, Icon }) => (
            <div
              key={optionKey}
              className={`${classes.statTile} ${statTileClassByCompact[compactKey]} ${statTileClassByAdvanced[advancedKey]}`}
            >
              <Icon className={classes.statIcon} style={zoomCompensatedSize(iconSize)} stroke={1.5} />
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
