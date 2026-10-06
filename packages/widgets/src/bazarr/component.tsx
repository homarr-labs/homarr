"use client";

import type { CSSProperties } from "react";
import { Text } from "@mantine/core";
import { IconAlertTriangle, IconBell, IconDeviceTv, IconMovie, IconPlugConnected } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { getIntegrationName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";

const compactStatOptions = [
  { option: "showMissingEpisodes", stat: "episodes" },
  { option: "showMissingMovies", stat: "movies" },
  { option: "showProviderIssues", stat: "providers" },
  { option: "showHealthIssues", stat: "status" },
] as const;

const allStatKeys = [
  "episodes",
  "movies",
  "providers",
  "status",
  "sonarrSignalr",
  "radarrSignalr",
  "announcements",
] as const;

type BazarrStatKey = (typeof allStatKeys)[number];
type BazarrVisibilityOptions = Record<(typeof compactStatOptions)[number]["option"], boolean>;

const statIcons = {
  episodes: IconDeviceTv,
  movies: IconMovie,
  providers: IconPlugConnected,
  status: IconAlertTriangle,
  sonarrSignalr: IconPlugConnected,
  radarrSignalr: IconPlugConnected,
  announcements: IconBell,
} as const;

const gridColsByWidth = [
  { minWidth: 640, cols: 4 },
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
  const t = useI18n("widget.bazarr");
  const { data: badges, error } = clientApi.widget.bazarr.getBadges.useQuery(
    { integrationId: integrationIds[0] ?? "" },
    { enabled: Boolean(integrationIds[0]) },
  );

  if (error && !badges) throw error;
  if (!badges) return <WidgetEmptyState />;

  const statValues = {
    episodes: badges.episodes,
    movies: badges.movies,
    providers: badges.providers,
    status: badges.status,
    sonarrSignalr: badges.sonarr_signalr,
    radarrSignalr: badges.radarr_signalr,
    announcements: badges.announcements,
  } satisfies Record<BazarrStatKey, number | string>;

  const visibleStatKeys = getVisibleBazarrStatKeys(options, displayMode);

  const gridCols = getGridCols(width, height, visibleStatKeys.length);
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
      <div
        className={classes.grid}
        data-short={height < 120 || undefined}
        style={{ "--stat-cols": gridCols } as CSSProperties}
      >
        {visibleStatKeys.map((statKey) => {
          const Icon = statIcons[statKey];
          const value = statValues[statKey];
          let label: string;
          if (statKey === "sonarrSignalr") {
            label = `${getIntegrationName("sonarr")} SignalR`;
          } else if (statKey === "radarrSignalr") {
            label = `${getIntegrationName("radarr")} SignalR`;
          } else {
            label = t(statKey);
          }
          const isWarning =
            typeof value === "number" &&
            (statKey === "providers" || statKey === "status" || statKey === "announcements") &&
            value > 0;

          return (
            <div key={statKey} className={`${classes.statTile} ${isWarning ? classes.statTileWarning : ""}`}>
              <Icon className={classes.statIcon} style={zoomCompensatedSize(iconSize)} stroke={1.5} />
              <span className={`${classes.statValue} ${isWarning ? classes.statValueWarning : ""}`}>
                {typeof value === "string" && value.trim() === "" ? "—" : value}
              </span>
              <span className={classes.statLabel} title={label}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const getVisibleBazarrStatKeys = (
  options: BazarrVisibilityOptions,
  displayMode?: "compact" | "advanced",
): BazarrStatKey[] => {
  if (displayMode === "advanced") return [...allStatKeys];
  return compactStatOptions.filter(({ option }) => options[option]).map(({ stat }) => stat);
};

export function getGridCols(width: number, height: number, itemCount: number): number {
  if (itemCount <= 1) return 1;

  const preferredColumns = gridColsByWidth.find(({ minWidth }) => width >= minWidth)?.cols ?? 1;
  const maxColumnsByWidth = Math.max(1, Math.floor(width / 100));
  const maxRowsByHeight = Math.max(1, Math.floor(height / 72));
  const columnsNeededToFit = Math.ceil(itemCount / maxRowsByHeight);
  return Math.min(itemCount, maxColumnsByWidth, Math.max(preferredColumns, columnsNeededToFit));
}

export function getIconSize(width: number): number {
  const match = iconSizeByWidth.find(({ minWidth }) => width >= minWidth);
  return match?.size ?? 16;
}
