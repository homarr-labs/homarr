export interface CommonOldmarrWidgetDefinition<
  TId extends OldmarrWidgetKinds,
  TOptions extends Record<string, unknown>,
> {
  id: TId;
  options: TOptions;
}

export type OldmarrWidgetKinds =
  | "calendar"
  | "indexer-manager"
  | "dashdot"
  | "usenet"
  | "weather"
  | "torrents-status"
  | "dlspeed"
  | "date"
  | "rss"
  | "video-stream"
  | "iframe"
  | "media-server"
  | "media-requests-list"
  | "media-requests-stats"
  | "dns-hole-summary"
  | "dns-hole-controls"
  | "bookmark"
  | "notebook"
  | "smart-home/entity-state"
  | "smart-home/trigger-automation"
  | "health-monitoring"
  | "media-transcoding";
