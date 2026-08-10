/**
 * Query policy used by the root client provider.
 *
 * Keep this module free of widget component/definition imports. Importing the
 * full widget registry from a root provider makes every widget part of the
 * initial client graph, even before a board has rendered one widget.
 */
export const widgetQueryRefetchIntervals = [
  { queryKey: [["docker", "getContainers"]], intervalSeconds: 30 },
  { queryKey: [["widget", "dnsHole"]], intervalSeconds: 5 },
  { queryKey: [["widget", "downloads", "getJobsAndStatuses"]], intervalSeconds: 5 },
  { queryKey: [["widget", "firewall"]], intervalSeconds: 5 },
  { queryKey: [["widget", "healthMonitoring"]], intervalSeconds: 5 },
  { queryKey: [["widget", "mediaServer", "getCurrentStreams"]], intervalSeconds: 5 },
  { queryKey: [["widget", "tracearr"]], intervalSeconds: 5 },
  { queryKey: [["widget", "immich", "getAlbum"]], intervalSeconds: null },
  { queryKey: [["widget", "immich", "getServerStats"]], intervalSeconds: null },
  { queryKey: [["widget", "immich", "getAlbums"]], intervalSeconds: null },
  { queryKey: [["widget", "indexerManager"]], intervalSeconds: null },
  { queryKey: [["widget", "mediaRelease"]], intervalSeconds: null },
  { queryKey: [["widget", "mediaTranscoding", "getDataAsync"]], intervalSeconds: null },
  { queryKey: [["widget", "minecraft", "getServerStatus"]], intervalSeconds: null },
  { queryKey: [["widget", "networkController"]], intervalSeconds: null },
  { queryKey: [["widget", "paperlessNgx"]], intervalSeconds: null },
  { queryKey: [["widget", "releases", "getLatest"]], intervalSeconds: null },
  { queryKey: [["widget", "rssFeed", "getFeeds"]], intervalSeconds: null },
  { queryKey: [["widget", "speedtestTracker"]], intervalSeconds: null },
  { queryKey: [["widget", "stockPrice", "getPriceHistory"]], intervalSeconds: null },
  { queryKey: [["widget", "umami", "getVisitorStats"]], intervalSeconds: null },
  { queryKey: [["widget", "umami", "getActiveVisitors"]], intervalSeconds: null },
  { queryKey: [["widget", "umami", "getMultiEventTimeSeries"]], intervalSeconds: null },
  { queryKey: [["widget", "umami", "getTopPages"]], intervalSeconds: null },
  { queryKey: [["widget", "umami", "getTopReferrers"]], intervalSeconds: null },
  { queryKey: [["widget", "vpn"]], intervalSeconds: null },
  { queryKey: [["widget", "wud"]], intervalSeconds: null },
] as const;
