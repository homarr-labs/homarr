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
  { queryKey: [["widget", "downloads"]], intervalSeconds: 5 },
  { queryKey: [["widget", "firewall"]], intervalSeconds: 5 },
  { queryKey: [["widget", "healthMonitoring"]], intervalSeconds: 5 },
  { queryKey: [["widget", "mediaServer"]], intervalSeconds: 5 },
  { queryKey: [["widget", "tracearr"]], intervalSeconds: 5 },
  { queryKey: [["widget", "immich"]], intervalSeconds: null },
  { queryKey: [["widget", "indexerManager"]], intervalSeconds: null },
  { queryKey: [["widget", "mediaRelease"]], intervalSeconds: null },
  { queryKey: [["widget", "mediaTranscoding"]], intervalSeconds: null },
  { queryKey: [["widget", "minecraft"]], intervalSeconds: null },
  { queryKey: [["widget", "networkController"]], intervalSeconds: null },
  { queryKey: [["widget", "notifications"]], intervalSeconds: null },
  { queryKey: [["widget", "paperlessNgx"]], intervalSeconds: null },
  { queryKey: [["widget", "releases"]], intervalSeconds: null },
  { queryKey: [["widget", "rssFeed"]], intervalSeconds: null },
  { queryKey: [["widget", "speedtestTracker"]], intervalSeconds: null },
  { queryKey: [["widget", "stockPrice"]], intervalSeconds: null },
  { queryKey: [["widget", "umami"]], intervalSeconds: null },
  { queryKey: [["widget", "vpn"]], intervalSeconds: null },
] as const;
