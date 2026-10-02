"use client";

import type { CSSProperties } from "react";
import { Text } from "@mantine/core";

import type { AudiobookshelfDashboardData, NavidromeDashboardData } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { getCompactStatLayout } from "../common/compact-stat-layout";
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

const rootClassByLayout = {
  default: "",
  short: classes.rootShort,
  narrowShort: classes.rootShort,
} as const;

const gridClassByLayout = {
  default: "",
  short: classes.gridShort,
  narrowShort: classes.gridShort,
} as const;

const statTileClassByLayout = {
  default: "",
  short: classes.statTileShort,
  narrowShort: `${classes.statTileShort} ${classes.statTileNarrowShort}`,
} as const;

const statLabelClassByLayout = {
  default: "",
  short: classes.statLabelShort,
  narrowShort: classes.statLabelShort,
} as const;

const statValueClassByLayout = {
  default: "",
  short: "",
  narrowShort: classes.statValueNarrowShort,
} as const;

const COMPACT_SINGLE_COLUMN_BREAKPOINT = 220;

interface AudioStatsContentProps {
  backend: AudioStatsBackend;
  stats: NavidromeDashboardData | AudiobookshelfDashboardData;
  options: AudioStatsDisplayOptions;
  showAllStats?: boolean;
  advanced?: boolean;
  width: number;
  height: number;
}

export function AudioStatsContent({
  backend,
  stats,
  options,
  showAllStats = false,
  advanced = false,
  width,
  height,
}: AudioStatsContentProps) {
  const t = useI18n(AUDIO_STATS_TRANSLATION_SCOPE);
  const compact = options.compactMode ?? false;
  const visibleStats = getVisibleStats(backend, options, stats, showAllStats);
  const compactKey = String(compact) as keyof typeof rootClassByCompact;
  const advancedKey = String(advanced) as keyof typeof statTileClassByAdvanced;
  let defaultGridCols = getGridCols(width, visibleStats.length, compact);
  if (!advanced && width < COMPACT_SINGLE_COLUMN_BREAKPOINT) {
    defaultGridCols = 1;
  }
  const layout = getCompactStatLayout({
    width,
    height,
    visibleCount: visibleStats.length,
    compactDisplay: !advanced,
    defaultColumns: defaultGridCols,
    defaultIconSize: getIconSize(width, compact),
  });

  return (
    <div className={`${classes.root} ${rootClassByCompact[compactKey]} ${rootClassByLayout[layout.state]}`}>
      {visibleStats.length > 0 && (
        <div
          className={`${classes.grid} ${gridClassByCompact[compactKey]} ${gridClassByLayout[layout.state]}`}
          style={{ "--stat-cols": layout.columns } as CSSProperties}
        >
          {visibleStats.map(({ optionKey, statKey, value, Icon }) => (
            <div
              key={optionKey}
              className={`${classes.statTile} ${statTileClassByCompact[compactKey]} ${statTileClassByAdvanced[advancedKey]} ${statTileClassByLayout[layout.state]}`}
            >
              <Icon className={classes.statIcon} style={zoomCompensatedSize(layout.iconSize)} stroke={1.5} />
              <span className={`${classes.statValue} ${statValueClassByLayout[layout.state]}`}>{value}</span>
              <span className={`${classes.statLabel} ${statLabelClassByLayout[layout.state]}`}>
                {t(statKey as never)}
              </span>
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
