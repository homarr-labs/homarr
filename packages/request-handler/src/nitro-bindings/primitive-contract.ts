type RequestPrimitive<T extends { handler: unknown }> = Pick<T, "handler">;
type CachedRequestPrimitive<T extends { handler: unknown; invalidateCache: unknown; invalidateCacheAsync: unknown }> =
  Pick<T, "handler" | "invalidateCache" | "invalidateCacheAsync">;

export interface WidgetRequestPrimitives {
  readonly airQuality: RequestPrimitive<typeof import("../air-quality").airQualityRequestHandler>;
  readonly anchorNote: CachedRequestPrimitive<typeof import("../anchor-notes").anchorNoteRequestHandler>;
  readonly anchorNotesList: CachedRequestPrimitive<typeof import("../anchor-notes").anchorNotesListRequestHandler>;
  readonly archiveTeamWarrior: RequestPrimitive<
    typeof import("../archive-team-warrior").archiveTeamWarriorRequestHandler
  >;
  readonly audiobookshelf: RequestPrimitive<typeof import("../audiobookshelf").audiobookshelfRequestHandler>;
  readonly navidrome: RequestPrimitive<typeof import("../navidrome").navidromeRequestHandler>;
  readonly bazarr: RequestPrimitive<typeof import("../bazarr").bazarrBadgesRequestHandler>;
  readonly beszelAlerts: RequestPrimitive<typeof import("../beszel").beszelAlertsRequestHandler>;
  readonly beszelStats: RequestPrimitive<typeof import("../beszel").beszelStatsRequestHandler>;
  readonly beszelSystems: RequestPrimitive<typeof import("../beszel").beszelSystemsRequestHandler>;
  readonly calendar: RequestPrimitive<typeof import("../calendar").calendarMonthRequestHandler>;
  readonly coolify: RequestPrimitive<typeof import("../coolify").coolifyRequestHandler>;
  readonly dnsHole: CachedRequestPrimitive<typeof import("../dns-hole").dnsHoleRequestHandler>;
  readonly downloads: CachedRequestPrimitive<typeof import("../downloads").downloadClientRequestHandler>;
  readonly firewallCpu: RequestPrimitive<typeof import("../firewall").firewallCpuRequestHandler>;
  readonly firewallInterfaces: RequestPrimitive<typeof import("../firewall").firewallInterfacesRequestHandler>;
  readonly firewallMemory: RequestPrimitive<typeof import("../firewall").firewallMemoryRequestHandler>;
  readonly firewallVersion: RequestPrimitive<typeof import("../firewall").firewallVersionRequestHandler>;
  readonly systemInfo: RequestPrimitive<typeof import("../health-monitoring").systemInfoRequestHandler>;
  readonly clusterInfo: RequestPrimitive<typeof import("../health-monitoring").clusterInfoRequestHandler>;
  readonly immichAlbum: RequestPrimitive<typeof import("../immich").immichAlbumRequestHandler>;
  readonly immichAlbumPreview: RequestPrimitive<typeof import("../immich").immichAlbumPreviewRequestHandler>;
  readonly immichAlbums: RequestPrimitive<typeof import("../immich").immichAlbumsRequestHandler>;
  readonly immichStats: RequestPrimitive<typeof import("../immich").immichStatsRequestHandler>;
  readonly indexerManager: CachedRequestPrimitive<typeof import("../indexer-manager").indexerManagerRequestHandler>;
  readonly llamacpp: RequestPrimitive<typeof import("../llamacpp").llamacppStatsRequestHandler>;
  readonly mediaOrganizer: RequestPrimitive<typeof import("../media-organizer").mediaOrganizerRequestHandler>;
  readonly mediaRelease: RequestPrimitive<typeof import("../media-release").mediaReleaseRequestHandler>;
  readonly mediaRequestList: CachedRequestPrimitive<
    typeof import("../media-request-list").mediaRequestListRequestHandler
  >;
  readonly mediaRequestStats: CachedRequestPrimitive<
    typeof import("../media-request-stats").mediaRequestStatsRequestHandler
  >;
  readonly mediaServer: RequestPrimitive<typeof import("../media-server").mediaServerRequestHandler>;
  readonly mediaTranscoding: RequestPrimitive<typeof import("../media-transcoding").mediaTranscodingRequestHandler>;
  readonly minecraft: RequestPrimitive<typeof import("../minecraft-server-status").minecraftServerStatusRequestHandler>;
  readonly networkController: RequestPrimitive<typeof import("../network-controller").networkControllerRequestHandler>;
  readonly notifications: CachedRequestPrimitive<typeof import("../notifications").notificationsRequestHandler>;
  readonly paperlessNgx: RequestPrimitive<typeof import("../paperless-ngx").paperlessNgxStatsRequestHandler>;
  readonly patchmon: RequestPrimitive<typeof import("../patchmon").patchmonStatsRequestHandler>;
  readonly releases: RequestPrimitive<typeof import("../releases").releasesRequestHandler>;
  readonly rssFeeds: RequestPrimitive<typeof import("../rss-feeds").rssFeedsRequestHandler>;
  readonly smartHome: CachedRequestPrimitive<
    typeof import("../smart-home-entity-state").smartHomeEntityStateRequestHandler
  >;
  readonly speedtestTracker: RequestPrimitive<typeof import("../speedtest-tracker").speedtestTrackerRequestHandler>;
  readonly stockPrice: RequestPrimitive<typeof import("../stock-price").fetchStockPriceHandler>;
  readonly timetableGet: RequestPrimitive<typeof import("../timetable").timetableGetTimetableRequestHandler>;
  readonly timetableSearch: RequestPrimitive<typeof import("../timetable").timetableSearchStationsRequestHandler>;
  readonly tracearr: RequestPrimitive<typeof import("../tracearr").tracearrRequestHandler>;
  readonly traefik: RequestPrimitive<typeof import("../traefik").traefikRequestHandler>;
  readonly umamiActiveVisitors: RequestPrimitive<typeof import("../umami").umamiActiveVisitorsRequestHandler>;
  readonly umamiEventNames: RequestPrimitive<typeof import("../umami").umamiEventNamesRequestHandler>;
  readonly umamiMultiEvent: RequestPrimitive<typeof import("../umami").umamiMultiEventRequestHandler>;
  readonly umami: RequestPrimitive<typeof import("../umami").umamiRequestHandler>;
  readonly umamiTopPages: RequestPrimitive<typeof import("../umami").umamiTopPagesRequestHandler>;
  readonly umamiTopReferrers: RequestPrimitive<typeof import("../umami").umamiTopReferrersRequestHandler>;
  readonly ups: RequestPrimitive<typeof import("../ups").upsSummariesRequestHandler>;
  readonly uptimeKuma: RequestPrimitive<typeof import("../uptime-kuma").uptimeKumaRequestHandler>;
  readonly vpn: RequestPrimitive<typeof import("../vpn").vpnSummaryHandler>;
  readonly wazuhAgents: RequestPrimitive<typeof import("../wazuh").wazuhAgentsRequestHandler>;
  readonly wazuhAlerts: RequestPrimitive<typeof import("../wazuh").wazuhAlertsRequestHandler>;
  readonly wazuhAuthFailures: RequestPrimitive<typeof import("../wazuh").wazuhAuthFailuresRequestHandler>;
  readonly wazuhFim: RequestPrimitive<typeof import("../wazuh").wazuhFimRequestHandler>;
  readonly wazuhSummary: RequestPrimitive<typeof import("../wazuh").wazuhSummaryRequestHandler>;
  readonly wazuhTopList: RequestPrimitive<typeof import("../wazuh").wazuhTopListRequestHandler>;
  readonly wazuhVulnerabilities: RequestPrimitive<typeof import("../wazuh").wazuhVulnerabilitiesRequestHandler>;
  readonly getWazuhTimelineRequestHandler: typeof import("../wazuh").getWazuhTimelineRequestHandler;
  readonly weather: RequestPrimitive<typeof import("../weather").weatherRequestHandler>;
  readonly wud: RequestPrimitive<typeof import("../wud").wudStatsRequestHandler>;
}
