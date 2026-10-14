import { useMemo } from "react";

import {
  createNativeWidgetMutation as mutation,
  createNativeWidgetQuery as query,
  createNativeWidgetSubscription as subscription,
  useWidgetQueryUtilities,
} from "./hooks";

export const nativeWidgetApi = {
  stats: {
    catalog: query(["widget", "stats", "catalog"], (client) => client.widget.stats.catalog),
    snapshot: query(["widget", "stats", "snapshot"], (client) => client.widget.stats.snapshot),
    refresh: mutation(["widget", "stats", "refresh"], (client) => client.widget.stats.refresh),
  },
  archiveTeamWarrior: {
    getStatus: query(
      ["widget", "archiveTeamWarrior", "getStatus"],
      (client) => client.widget.archiveTeamWarrior.getStatus,
    ),
  },
  beszel: {
    getSystems: query(["widget", "beszel", "getSystems"], (client) => client.widget.beszel.getSystems),
    getAlerts: query(["widget", "beszel", "getAlerts"], (client) => client.widget.beszel.getAlerts),
    getSystemStats: query(["widget", "beszel", "getSystemStats"], (client) => client.widget.beszel.getSystemStats),
    subscribeSystemStats: subscription(
      ["widget", "beszel", "subscribeSystemStats"],
      (client) => client.widget.beszel.subscribeSystemStats,
    ),
  },
  anchorNotes: {
    listNotes: query(["widget", "anchorNotes", "listNotes"], (client) => client.widget.anchorNotes.listNotes),
    getNote: query(["widget", "anchorNotes", "getNote"], (client) => client.widget.anchorNotes.getNote),
    updateNote: mutation(["widget", "anchorNotes", "updateNote"], (client) => client.widget.anchorNotes.updateNote),
  },
  coolify: {
    getInstancesInfo: query(
      ["widget", "coolify", "getInstancesInfo"],
      (client) => client.widget.coolify.getInstancesInfo,
    ),
  },
  immich: {
    getServerStats: query(["widget", "immich", "getServerStats"], (client) => client.widget.immich.getServerStats),
    getAlbum: query(["widget", "immich", "getAlbum"], (client) => client.widget.immich.getAlbum),
    getAlbumPreview: query(["widget", "immich", "getAlbumPreview"], (client) => client.widget.immich.getAlbumPreview),
    getAlbums: query(["widget", "immich", "getAlbums"], (client) => client.widget.immich.getAlbums),
  },
  paperlessNgx: {
    getStats: query(["widget", "paperlessNgx", "getStats"], (client) => client.widget.paperlessNgx.getStats),
  },
  patchmon: {
    getStats: query(["widget", "patchmon", "getStats"], (client) => client.widget.patchmon.getStats),
  },
  bazarr: {
    getBadges: query(["widget", "bazarr", "getBadges"], (client) => client.widget.bazarr.getBadges),
  },
  notebook: {
    updateContent: mutation(["widget", "notebook", "updateContent"], (client) => client.widget.notebook.updateContent),
  },
  weather: {
    atLocation: query(["widget", "weather", "atLocation"], (client) => client.widget.weather.atLocation),
  },
  airQuality: {
    atLocation: query(["widget", "airQuality", "atLocation"], (client) => client.widget.airQuality.atLocation),
  },
  app: {
    ping: query(["widget", "app", "ping"], (client) => client.widget.app.ping),
  },
  dnsHole: {
    summary: query(["widget", "dnsHole", "summary"], (client) => client.widget.dnsHole.summary),
    enable: mutation(["widget", "dnsHole", "enable"], (client) => client.widget.dnsHole.enable),
    disable: mutation(["widget", "dnsHole", "disable"], (client) => client.widget.dnsHole.disable),
  },
  smartHome: {
    entityState: query(["widget", "smartHome", "entityState"], (client) => client.widget.smartHome.entityState),
    entityDetails: query(["widget", "smartHome", "entityDetails"], (client) => client.widget.smartHome.entityDetails),
    switchEntity: mutation(["widget", "smartHome", "switchEntity"], (client) => client.widget.smartHome.switchEntity),
    executeAutomation: mutation(
      ["widget", "smartHome", "executeAutomation"],
      (client) => client.widget.smartHome.executeAutomation,
    ),
  },
  stockPrice: {
    getPriceHistory: query(
      ["widget", "stockPrice", "getPriceHistory"],
      (client) => client.widget.stockPrice.getPriceHistory,
    ),
  },
  mediaServer: {
    getCurrentStreams: query(
      ["widget", "mediaServer", "getCurrentStreams"],
      (client) => client.widget.mediaServer.getCurrentStreams,
    ),
  },
  mediaRelease: {
    getMediaReleases: query(
      ["widget", "mediaRelease", "getMediaReleases"],
      (client) => client.widget.mediaRelease.getMediaReleases,
    ),
  },
  calendar: {
    findAllEvents: query(["widget", "calendar", "findAllEvents"], (client) => client.widget.calendar.findAllEvents),
  },
  downloads: {
    getJobsAndStatuses: query(
      ["widget", "downloads", "getJobsAndStatuses"],
      (client) => client.widget.downloads.getJobsAndStatuses,
    ),
    pause: mutation(["widget", "downloads", "pause"], (client) => client.widget.downloads.pause),
    pauseItem: mutation(["widget", "downloads", "pauseItem"], (client) => client.widget.downloads.pauseItem),
    resume: mutation(["widget", "downloads", "resume"], (client) => client.widget.downloads.resume),
    resumeItem: mutation(["widget", "downloads", "resumeItem"], (client) => client.widget.downloads.resumeItem),
    deleteItem: mutation(["widget", "downloads", "deleteItem"], (client) => client.widget.downloads.deleteItem),
  },
  mediaRequests: {
    getLatestRequests: query(
      ["widget", "mediaRequests", "getLatestRequests"],
      (client) => client.widget.mediaRequests.getLatestRequests,
    ),
    getStats: query(["widget", "mediaRequests", "getStats"], (client) => client.widget.mediaRequests.getStats),
    answerRequest: mutation(
      ["widget", "mediaRequests", "answerRequest"],
      (client) => client.widget.mediaRequests.answerRequest,
    ),
  },
  mediaOrganizer: {
    getData: query(["widget", "mediaOrganizer", "getData"], (client) => client.widget.mediaOrganizer.getData),
  },
  rssFeed: {
    getFeeds: query(["widget", "rssFeed", "getFeeds"], (client) => client.widget.rssFeed.getFeeds),
  },
  indexerManager: {
    getIndexersStatus: query(
      ["widget", "indexerManager", "getIndexersStatus"],
      (client) => client.widget.indexerManager.getIndexersStatus,
    ),
    testAllIndexers: mutation(
      ["widget", "indexerManager", "testAllIndexers"],
      (client) => client.widget.indexerManager.testAllIndexers,
    ),
  },
  healthMonitoring: {
    getSystemHealthStatus: query(
      ["widget", "healthMonitoring", "getSystemHealthStatus"],
      (client) => client.widget.healthMonitoring.getSystemHealthStatus,
    ),
    listStorageVolumes: query(
      ["widget", "healthMonitoring", "listStorageVolumes"],
      (client) => client.widget.healthMonitoring.listStorageVolumes,
    ),
    getClusterHealthStatus: query(
      ["widget", "healthMonitoring", "getClusterHealthStatus"],
      (client) => client.widget.healthMonitoring.getClusterHealthStatus,
    ),
  },
  mediaTranscoding: {
    getDataAsync: query(
      ["widget", "mediaTranscoding", "getDataAsync"],
      (client) => client.widget.mediaTranscoding.getDataAsync,
    ),
  },
  minecraft: {
    getServerStatus: query(
      ["widget", "minecraft", "getServerStatus"],
      (client) => client.widget.minecraft.getServerStatus,
    ),
  },
  options: {
    getWidgetOptionSettings: query(
      ["widget", "options", "getWidgetOptionSettings"],
      (client) => client.widget.options.getWidgetOptionSettings,
    ),
    saveItemOptions: mutation(
      ["widget", "options", "saveItemOptions"],
      (client) => client.widget.options.saveItemOptions,
    ),
  },
  releases: {
    getLatest: query(["widget", "releases", "getLatest"], (client) => client.widget.releases.getLatest),
  },
  networkController: {
    summary: query(["widget", "networkController", "summary"], (client) => client.widget.networkController.summary),
  },
  firewall: {
    getFirewallCpuStatus: query(
      ["widget", "firewall", "getFirewallCpuStatus"],
      (client) => client.widget.firewall.getFirewallCpuStatus,
    ),
    getFirewallInterfacesStatus: query(
      ["widget", "firewall", "getFirewallInterfacesStatus"],
      (client) => client.widget.firewall.getFirewallInterfacesStatus,
    ),
    getFirewallVersionStatus: query(
      ["widget", "firewall", "getFirewallVersionStatus"],
      (client) => client.widget.firewall.getFirewallVersionStatus,
    ),
    getFirewallMemoryStatus: query(
      ["widget", "firewall", "getFirewallMemoryStatus"],
      (client) => client.widget.firewall.getFirewallMemoryStatus,
    ),
  },
  notifications: {
    deleteNotification: mutation(
      ["widget", "notifications", "deleteNotification"],
      (client) => client.widget.notifications.deleteNotification,
    ),
    getNotifications: query(
      ["widget", "notifications", "getNotifications"],
      (client) => client.widget.notifications.getNotifications,
    ),
  },
  timetable: {
    getTimetable: query(["widget", "timetable", "getTimetable"], (client) => client.widget.timetable.getTimetable),
    searchStations: query(
      ["widget", "timetable", "searchStations"],
      (client) => client.widget.timetable.searchStations,
    ),
  },
  tracearr: {
    getDashboard: query(["widget", "tracearr", "getDashboard"], (client) => client.widget.tracearr.getDashboard),
  },
  speedtestTracker: {
    getDashboard: query(
      ["widget", "speedtestTracker", "getDashboard"],
      (client) => client.widget.speedtestTracker.getDashboard,
    ),
  },
  uptimeKuma: {
    getDashboard: query(["widget", "uptimeKuma", "getDashboard"], (client) => client.widget.uptimeKuma.getDashboard),
  },
  audioStats: {
    getStats: query(["widget", "audioStats", "getStats"], (client) => client.widget.audioStats.getStats),
  },
  umami: {
    getWebsites: query(["widget", "umami", "getWebsites"], (client) => client.widget.umami.getWebsites),
    getVisitorStats: query(["widget", "umami", "getVisitorStats"], (client) => client.widget.umami.getVisitorStats),
    getEventNames: query(["widget", "umami", "getEventNames"], (client) => client.widget.umami.getEventNames),
    getTopPages: query(["widget", "umami", "getTopPages"], (client) => client.widget.umami.getTopPages),
    getTopReferrers: query(["widget", "umami", "getTopReferrers"], (client) => client.widget.umami.getTopReferrers),
    getMultiEventTimeSeries: query(
      ["widget", "umami", "getMultiEventTimeSeries"],
      (client) => client.widget.umami.getMultiEventTimeSeries,
    ),
    getActiveVisitors: query(
      ["widget", "umami", "getActiveVisitors"],
      (client) => client.widget.umami.getActiveVisitors,
    ),
  },
  vpn: {
    getSummaries: query(["widget", "vpn", "getSummaries"], (client) => client.widget.vpn.getSummaries),
  },
  ups: {
    getSummaries: query(["widget", "ups", "getSummaries"], (client) => client.widget.ups.getSummaries),
  },
  traefik: {
    getDashboard: query(["widget", "traefik", "getDashboard"], (client) => client.widget.traefik.getDashboard),
  },
  customApi: {
    refresh: mutation(["widget", "customApi", "refresh"], (client) => client.widget.customApi.refresh),
    getData: query(["widget", "customApi", "getData"], (client) => client.widget.customApi.getData),
    queryRequest: query(["widget", "customApi", "queryRequest"], (client) => client.widget.customApi.queryRequest),
    executeAction: mutation(
      ["widget", "customApi", "executeAction"],
      (client) => client.widget.customApi.executeAction,
    ),
  },
  secrets: {
    setSecret: mutation(["widget", "secrets", "setSecret"], (client) => client.widget.secrets.setSecret),
    deleteSecret: mutation(["widget", "secrets", "deleteSecret"], (client) => client.widget.secrets.deleteSecret),
    getConfiguredKinds: query(
      ["widget", "secrets", "getConfiguredKinds"],
      (client) => client.widget.secrets.getConfiguredKinds,
    ),
  },
  wud: {
    getStats: query(["widget", "wud", "getStats"], (client) => client.widget.wud.getStats),
  },
  llamacpp: {
    getStats: query(["widget", "llamacpp", "getStats"], (client) => client.widget.llamacpp.getStats),
  },
  wazuh: {
    getAgents: query(["widget", "wazuh", "getAgents"], (client) => client.widget.wazuh.getAgents),
    getAlerts: query(["widget", "wazuh", "getAlerts"], (client) => client.widget.wazuh.getAlerts),
    getSummary: query(["widget", "wazuh", "getSummary"], (client) => client.widget.wazuh.getSummary),
    getTimeline: query(["widget", "wazuh", "getTimeline"], (client) => client.widget.wazuh.getTimeline),
    getTopList: query(["widget", "wazuh", "getTopList"], (client) => client.widget.wazuh.getTopList),
    getVulnerabilities: query(
      ["widget", "wazuh", "getVulnerabilities"],
      (client) => client.widget.wazuh.getVulnerabilities,
    ),
    getFim: query(["widget", "wazuh", "getFim"], (client) => client.widget.wazuh.getFim),
    getAuthFailures: query(["widget", "wazuh", "getAuthFailures"], (client) => client.widget.wazuh.getAuthFailures),
  },
};

function useUtils() {
  const { queryClient, cacheScope, client } = useWidgetQueryUtilities();
  return useMemo(
    () => ({
      widget: {
        stats: {
          catalog: nativeWidgetApi.stats.catalog.utilities(queryClient, cacheScope, client),
          snapshot: nativeWidgetApi.stats.snapshot.utilities(queryClient, cacheScope, client),
        },
        dnsHole: { summary: nativeWidgetApi.dnsHole.summary.utilities(queryClient, cacheScope, client) },
        smartHome: {
          entityDetails: nativeWidgetApi.smartHome.entityDetails.utilities(queryClient, cacheScope, client),
          entityState: nativeWidgetApi.smartHome.entityState.utilities(queryClient, cacheScope, client),
        },
        downloads: {
          getJobsAndStatuses: nativeWidgetApi.downloads.getJobsAndStatuses.utilities(queryClient, cacheScope, client),
        },
        indexerManager: {
          getIndexersStatus: nativeWidgetApi.indexerManager.getIndexersStatus.utilities(
            queryClient,
            cacheScope,
            client,
          ),
        },
        mediaRequests: {
          getLatestRequests: nativeWidgetApi.mediaRequests.getLatestRequests.utilities(queryClient, cacheScope, client),
          getStats: nativeWidgetApi.mediaRequests.getStats.utilities(queryClient, cacheScope, client),
        },
        notifications: {
          getNotifications: nativeWidgetApi.notifications.getNotifications.utilities(queryClient, cacheScope, client),
        },
        customApi: { getData: nativeWidgetApi.customApi.getData.utilities(queryClient, cacheScope, client) },
        secrets: {
          getConfiguredKinds: nativeWidgetApi.secrets.getConfiguredKinds.utilities(queryClient, cacheScope, client),
        },
      },
      client: {
        widget: {
          stats: {
            refresh: {
              mutate: (input: Parameters<typeof client.widget.stats.refresh>[0]) => client.widget.stats.refresh(input),
            },
          },
        },
      },
    }),
    [queryClient, cacheScope, client],
  );
}

export const clientApi = { widget: nativeWidgetApi, useUtils };
