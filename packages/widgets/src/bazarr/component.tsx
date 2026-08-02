"use client";

import type { CSSProperties } from "react";
import { Text } from "@mantine/core";
import { IconAlertTriangle, IconDeviceTv, IconMovie, IconPlugConnected } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";

const statVisibilityByOption = {
  showMissingEpisodes: "episodes",
  showMissingMovies: "movies",
  showProviderIssues: "providers",
  showHealthIssues: "status",
} as const;

const statIcons = {
  episodes: IconDeviceTv,
  movies: IconMovie,
  providers: IconPlugConnected,
  status: IconAlertTriangle,
} as const;

const gridColsByWidth = [
  { minWidth: 380, cols: 2 },
  { minWidth: 0, cols: 1 },
] as const;

const iconSizeByWidth = [
  { minWidth: 320, size: 22 },
  { minWidth: 200, size: 18 },
  { minWidth: 0, size: 16 },
] as const;

export default function BazarrWidget({
  integrationIds,
  options,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"bazarr">) {
  const t = useScopedI18n("widget.bazarr");
  const { data: badges } = clientApi.widget.bazarr.getBadges.useQuery(
    { integrationId: integrationIds[0] ?? "" },
    { enabled: Boolean(integrationIds[0]) },
  );

  if (!badges) return <WidgetEmptyState />;

  const statValues = {
    episodes: badges.episodes,
    movies: badges.movies,
    providers: badges.providers,
    status: badges.status,
  } as const;

  const visibleStatKeys = Object.entries(statVisibilityByOption)
    .filter(([optionKey]) => displayMode === "advanced" || options[optionKey as keyof typeof options])
    .map(([, statKey]) => statKey);

  const gridCols = getGridCols(width, height, visibleStatKeys.length, displayMode === "advanced");
  const iconSize = getIconSize(Math.min(width, height));

  if (visibleStatKeys.length === 0) {
    return (
      <div className={classes.root}>
        <div className={classes.emptyState}>
          <Text size="sm" c="dimmed">
            —
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <div className={classes.grid} style={{ "--stat-cols": gridCols } as CSSProperties}>
        {visibleStatKeys.map((statKey) => {
          const Icon = statIcons[statKey];
          const value = statValues[statKey];
          const isWarning = (statKey === "providers" || statKey === "status") && value > 0;

          return (
            <div key={statKey} className={`${classes.statTile} ${isWarning ? classes.statTileWarning : ""}`}>
              <Icon className={classes.statIcon} size={iconSize} stroke={1.5} />
              <span className={`${classes.statValue} ${isWarning ? classes.statValueWarning : ""}`}>{value}</span>
              <span className={classes.statLabel} title={t(statKey)}>
                {t(statKey)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function getGridCols(width: number, height: number, itemCount: number, isAdvanced = false): number {
  if (itemCount <= 1) return 1;
  if (isAdvanced && width >= 640) return Math.min(itemCount, 4);

  const widthMatch = gridColsByWidth.find(({ minWidth }) => width >= minWidth)?.cols ?? 1;
  const rowsAtWidth = Math.ceil(itemCount / widthMatch);
  const rowHeight = height / rowsAtWidth;
  return rowHeight >= 72 ? widthMatch : Math.min(itemCount, Math.max(widthMatch, 2));
}

export function getIconSize(width: number): number {
  const match = iconSizeByWidth.find(({ minWidth }) => width >= minWidth);
  return match?.size ?? 16;
}
