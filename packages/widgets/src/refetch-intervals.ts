/**
 * Lightweight query defaults for the root client provider.
 *
 * Keep this list free of widget imports: importing widget definitions here
 * would put every widget in the initial client bundle.
 */
export const widgetQueryRefetchIntervals = [
  { queryKey: [["docker", "getContainers"]], intervalSeconds: 30 },
  { queryKey: [["widget", "dnsHole"]], intervalSeconds: 10 },
  {
    queryKey: [["widget", "downloads", "getJobsAndStatuses"]],
    intervalSeconds: 10,
    staleTimeSeconds: 10,
  },
  { queryKey: [["widget", "firewall"]], intervalSeconds: 10 },
  { queryKey: [["widget", "healthMonitoring"]], intervalSeconds: 10 },
  { queryKey: [["widget", "mediaServer", "getCurrentStreams"]], intervalSeconds: 10 },
  { queryKey: [["widget", "tracearr"]], intervalSeconds: 10 },
  {
    queryKey: [["widget", "weather", "atLocation"]],
    intervalSeconds: 600,
    staleTimeSeconds: 300,
  },
  { queryKey: [["widget", "airQuality", "atLocation"]], intervalSeconds: 900 },
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
