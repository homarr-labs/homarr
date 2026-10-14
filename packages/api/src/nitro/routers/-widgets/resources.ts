import type { SecretCodec } from "@homarr/auth/nitro/policy";
import type * as operators from "@homarr/db";
import type * as tables from "@homarr/db/schema";
import type { IntegrationKind, IntegrationSecretKind } from "@homarr/definitions";
import type {
  CustomWidgetHttpRequest,
  CustomWidgetHttpResponse,
  RequestLimitInput,
} from "@homarr/custom-widgets/server";
import type { BackendContext } from "../../context";
import type { ResourceAuthorizationSelection, ResourceAuthorizationSnapshot } from "../-resource-authority/repository";

type RequestPrimitive<T extends { handler: unknown }> = Pick<T, "handler">;
type CachedRequestPrimitive<T extends { handler: unknown; invalidateCache: unknown; invalidateCacheAsync: unknown }> =
  Pick<T, "handler" | "invalidateCache" | "invalidateCacheAsync">;

export interface WidgetRequestPrimitives {
  readonly airQuality: RequestPrimitive<typeof import("@homarr/request-handler/air-quality").airQualityRequestHandler>;
  readonly anchorNote: CachedRequestPrimitive<
    typeof import("@homarr/request-handler/anchor-notes").anchorNoteRequestHandler
  >;
  readonly anchorNotesList: CachedRequestPrimitive<
    typeof import("@homarr/request-handler/anchor-notes").anchorNotesListRequestHandler
  >;
  readonly archiveTeamWarrior: RequestPrimitive<
    typeof import("@homarr/request-handler/archive-team-warrior").archiveTeamWarriorRequestHandler
  >;
  readonly audiobookshelf: RequestPrimitive<
    typeof import("@homarr/request-handler/audiobookshelf").audiobookshelfRequestHandler
  >;
  readonly navidrome: RequestPrimitive<typeof import("@homarr/request-handler/navidrome").navidromeRequestHandler>;
  readonly bazarr: RequestPrimitive<typeof import("@homarr/request-handler/bazarr").bazarrBadgesRequestHandler>;
  readonly beszelAlerts: RequestPrimitive<typeof import("@homarr/request-handler/beszel").beszelAlertsRequestHandler>;
  readonly beszelStats: RequestPrimitive<typeof import("@homarr/request-handler/beszel").beszelStatsRequestHandler>;
  readonly beszelSystems: RequestPrimitive<typeof import("@homarr/request-handler/beszel").beszelSystemsRequestHandler>;
  readonly calendar: RequestPrimitive<typeof import("@homarr/request-handler/calendar").calendarMonthRequestHandler>;
  readonly coolify: RequestPrimitive<typeof import("@homarr/request-handler/coolify").coolifyRequestHandler>;
  readonly dnsHole: CachedRequestPrimitive<typeof import("@homarr/request-handler/dns-hole").dnsHoleRequestHandler>;
  readonly downloads: CachedRequestPrimitive<
    typeof import("@homarr/request-handler/downloads").downloadClientRequestHandler
  >;
  readonly firewallCpu: RequestPrimitive<typeof import("@homarr/request-handler/firewall").firewallCpuRequestHandler>;
  readonly firewallInterfaces: RequestPrimitive<
    typeof import("@homarr/request-handler/firewall").firewallInterfacesRequestHandler
  >;
  readonly firewallMemory: RequestPrimitive<
    typeof import("@homarr/request-handler/firewall").firewallMemoryRequestHandler
  >;
  readonly firewallVersion: RequestPrimitive<
    typeof import("@homarr/request-handler/firewall").firewallVersionRequestHandler
  >;
  readonly systemInfo: RequestPrimitive<
    typeof import("@homarr/request-handler/health-monitoring").systemInfoRequestHandler
  >;
  readonly clusterInfo: RequestPrimitive<
    typeof import("@homarr/request-handler/health-monitoring").clusterInfoRequestHandler
  >;
  readonly immichAlbum: RequestPrimitive<typeof import("@homarr/request-handler/immich").immichAlbumRequestHandler>;
  readonly immichAlbumPreview: RequestPrimitive<
    typeof import("@homarr/request-handler/immich").immichAlbumPreviewRequestHandler
  >;
  readonly immichAlbums: RequestPrimitive<typeof import("@homarr/request-handler/immich").immichAlbumsRequestHandler>;
  readonly immichStats: RequestPrimitive<typeof import("@homarr/request-handler/immich").immichStatsRequestHandler>;
  readonly indexerManager: CachedRequestPrimitive<
    typeof import("@homarr/request-handler/indexer-manager").indexerManagerRequestHandler
  >;
  readonly llamacpp: RequestPrimitive<typeof import("@homarr/request-handler/llamacpp").llamacppStatsRequestHandler>;
  readonly mediaOrganizer: RequestPrimitive<
    typeof import("@homarr/request-handler/media-organizer").mediaOrganizerRequestHandler
  >;
  readonly mediaRelease: RequestPrimitive<
    typeof import("@homarr/request-handler/media-release").mediaReleaseRequestHandler
  >;
  readonly mediaRequestList: CachedRequestPrimitive<
    typeof import("@homarr/request-handler/media-request-list").mediaRequestListRequestHandler
  >;
  readonly mediaRequestStats: CachedRequestPrimitive<
    typeof import("@homarr/request-handler/media-request-stats").mediaRequestStatsRequestHandler
  >;
  readonly mediaServer: RequestPrimitive<
    typeof import("@homarr/request-handler/media-server").mediaServerRequestHandler
  >;
  readonly mediaTranscoding: RequestPrimitive<
    typeof import("@homarr/request-handler/media-transcoding").mediaTranscodingRequestHandler
  >;
  readonly minecraft: RequestPrimitive<
    typeof import("@homarr/request-handler/minecraft-server-status").minecraftServerStatusRequestHandler
  >;
  readonly networkController: RequestPrimitive<
    typeof import("@homarr/request-handler/network-controller").networkControllerRequestHandler
  >;
  readonly notifications: CachedRequestPrimitive<
    typeof import("@homarr/request-handler/notifications").notificationsRequestHandler
  >;
  readonly paperlessNgx: RequestPrimitive<
    typeof import("@homarr/request-handler/paperless-ngx").paperlessNgxStatsRequestHandler
  >;
  readonly patchmon: RequestPrimitive<typeof import("@homarr/request-handler/patchmon").patchmonStatsRequestHandler>;
  readonly releases: RequestPrimitive<typeof import("@homarr/request-handler/releases").releasesRequestHandler>;
  readonly rssFeeds: RequestPrimitive<typeof import("@homarr/request-handler/rss-feeds").rssFeedsRequestHandler>;
  readonly smartHome: CachedRequestPrimitive<
    typeof import("@homarr/request-handler/smart-home-entity-state").smartHomeEntityStateRequestHandler
  >;
  readonly speedtestTracker: RequestPrimitive<
    typeof import("@homarr/request-handler/speedtest-tracker").speedtestTrackerRequestHandler
  >;
  readonly stockPrice: RequestPrimitive<typeof import("@homarr/request-handler/stock-price").fetchStockPriceHandler>;
  readonly timetableGet: RequestPrimitive<
    typeof import("@homarr/request-handler/timetable").timetableGetTimetableRequestHandler
  >;
  readonly timetableSearch: RequestPrimitive<
    typeof import("@homarr/request-handler/timetable").timetableSearchStationsRequestHandler
  >;
  readonly tracearr: RequestPrimitive<typeof import("@homarr/request-handler/tracearr").tracearrRequestHandler>;
  readonly traefik: RequestPrimitive<typeof import("@homarr/request-handler/traefik").traefikRequestHandler>;
  readonly umamiActiveVisitors: RequestPrimitive<
    typeof import("@homarr/request-handler/umami").umamiActiveVisitorsRequestHandler
  >;
  readonly umamiEventNames: RequestPrimitive<
    typeof import("@homarr/request-handler/umami").umamiEventNamesRequestHandler
  >;
  readonly umamiMultiEvent: RequestPrimitive<
    typeof import("@homarr/request-handler/umami").umamiMultiEventRequestHandler
  >;
  readonly umami: RequestPrimitive<typeof import("@homarr/request-handler/umami").umamiRequestHandler>;
  readonly umamiTopPages: RequestPrimitive<typeof import("@homarr/request-handler/umami").umamiTopPagesRequestHandler>;
  readonly umamiTopReferrers: RequestPrimitive<
    typeof import("@homarr/request-handler/umami").umamiTopReferrersRequestHandler
  >;
  readonly ups: RequestPrimitive<typeof import("@homarr/request-handler/ups").upsSummariesRequestHandler>;
  readonly uptimeKuma: RequestPrimitive<typeof import("@homarr/request-handler/uptime-kuma").uptimeKumaRequestHandler>;
  readonly vpn: RequestPrimitive<typeof import("@homarr/request-handler/vpn").vpnSummaryHandler>;
  readonly wazuhAgents: RequestPrimitive<typeof import("@homarr/request-handler/wazuh").wazuhAgentsRequestHandler>;
  readonly wazuhAlerts: RequestPrimitive<typeof import("@homarr/request-handler/wazuh").wazuhAlertsRequestHandler>;
  readonly wazuhAuthFailures: RequestPrimitive<
    typeof import("@homarr/request-handler/wazuh").wazuhAuthFailuresRequestHandler
  >;
  readonly wazuhFim: RequestPrimitive<typeof import("@homarr/request-handler/wazuh").wazuhFimRequestHandler>;
  readonly wazuhSummary: RequestPrimitive<typeof import("@homarr/request-handler/wazuh").wazuhSummaryRequestHandler>;
  readonly wazuhTopList: RequestPrimitive<typeof import("@homarr/request-handler/wazuh").wazuhTopListRequestHandler>;
  readonly wazuhVulnerabilities: RequestPrimitive<
    typeof import("@homarr/request-handler/wazuh").wazuhVulnerabilitiesRequestHandler
  >;
  readonly getWazuhTimelineRequestHandler: typeof import("@homarr/request-handler/wazuh").getWazuhTimelineRequestHandler;
  readonly weather: RequestPrimitive<typeof import("@homarr/request-handler/weather").weatherRequestHandler>;
  readonly wud: RequestPrimitive<typeof import("@homarr/request-handler/wud").wudStatsRequestHandler>;
}

export type WidgetIntegration<TKind extends IntegrationKind = IntegrationKind> = Omit<tables.Integration, "kind"> & {
  kind: TKind;
  externalUrl: string | null;
  decryptedSecrets: { kind: IntegrationSecretKind; value: string; updatedAt?: Date }[];
};

export interface WidgetRequestLease {
  readonly requests: WidgetRequestPrimitives;
  readonly createIntegrationAsync: typeof import("@homarr/integrations/factory").createIntegrationAsync;
  readonly getStatsSnapshotAsync: typeof import("@homarr/request-handler/stats").getStatsSnapshotAsync;
  readonly refreshStatsAsync: typeof import("@homarr/request-handler/stats").refreshStatsAsync;
  readonly sendPingRequestAsync: typeof import("@homarr/ping").sendPingRequestAsync;
  readonly executeCustomWidgetRequest: (input: CustomWidgetHttpRequest) => Promise<CustomWidgetHttpResponse>;
  readonly invalidateCustomWidgetResponseCache: (prefixes: readonly string[]) => void;
  readonly acquireCustomWidgetRequestLimit: (input: RequestLimitInput) => Promise<() => Promise<void>>;
  readonly getIntegrationHttpConnection: (
    integration: HttpIntegration,
    authenticate: boolean,
  ) => Promise<
    Pick<
      CustomWidgetHttpRequest,
      "baseUrl" | "networkScope" | "auth" | "tls" | "pathPrefix" | "redactSecrets" | "resolveConnectionAsync"
    > & { cacheVersion: string }
  >;
  readonly lookup: typeof import("node:dns/promises").lookup;
  assertCurrentAsync(): Promise<void>;
  releaseAsync(): Promise<void>;
}

export type HttpIntegration = tables.Integration & { secrets: tables.IntegrationSecret[] };

export interface WidgetProcedureResources {
  readonly tables: Pick<
    typeof tables,
    | "apps"
    | "boards"
    | "boardUserPermissions"
    | "boardGroupPermissions"
    | "items"
    | "users"
    | "integrations"
    | "widgetSecrets"
    | "customWidgetDefinitions"
    | "legacyCustomWidgetDefinitions"
    | "groupMembers"
    | "integrationUserPermissions"
    | "integrationGroupPermissions"
  >;
  readonly operators: Pick<typeof operators, "eq" | "and" | "or" | "inArray">;
  readonly handleTransactionsAsync: typeof operators.handleTransactionsAsync;
  readonly codec: Pick<SecretCodec, "encryptSecret" | "decryptSecret">;
  readonly getServerSettingsAsync: typeof import("@homarr/db/queries").getServerSettingsAsync;
  readonly getServerSettingByKeyAsync: typeof import("@homarr/db/queries").getServerSettingByKeyAsync;
  readonly noExternalConnection: boolean;
  readonly mockWidgetData: typeof import("@homarr/integrations").mockWidgetData;
  readonly getStatsMetrics: typeof import("@homarr/integrations/stats").getStatsMetrics;
  readonly stockPriceTimeFrames: typeof import("@homarr/definitions/stock-price").stockPriceTimeFrames;
  readonly toSafeEntityDetails: typeof import("@homarr/request-handler/smart-home-entity-state").toSafeEntityDetails;
  readonly toWazuhPublicError: typeof import("@homarr/integrations").toWazuhPublicError;
  readonly mediaRequestListInputSchema: typeof import("@homarr/request-handler/media-request-list").mediaRequestListInputSchema;
  readonly logger: {
    debug(message: string, metadata?: Readonly<Record<string, unknown>>): void;
    warn(message: string | Error, metadata?: Readonly<Record<string, unknown>>): void;
    error(message: string, metadata?: Readonly<Record<string, unknown>>): void;
  };
  acquireRequestAsync(context: BackendContext): Promise<WidgetRequestLease>;
  acquireAuthorizationSnapshotAsync(
    context: BackendContext,
    selection: ResourceAuthorizationSelection,
  ): Promise<ResourceAuthorizationSnapshot>;
}

export type WidgetRuntimeContext = BackendContext & { readonly widgetLease: WidgetRequestLease };
