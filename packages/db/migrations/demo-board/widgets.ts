// The current demo widgets share their options across the Home, Media and Systems tabs.
import type { IntegrationKind } from "@homarr/definitions";
import type { DemoBoardDefinition } from "./types";

type DemoWidget = DemoBoardDefinition["tabs"][number]["widgets"][number] & { section?: "right" };

const demoStatsSources = [
  { kind: "sonarr", metrics: ["shows", "episodes", "monitored", "missing"] },
  { kind: "radarr", metrics: ["movies", "monitored", "queued"] },
  { kind: "qBittorrent", metrics: ["download", "upload", "paused"] },
  { kind: "proxmox", metrics: ["nodes", "vms", "lxcs"] },
  {
    kind: "piHole",
    metrics: ["dnsQueriesToday", "adsBlockedToday", "adsBlockedTodayPercentage"],
  },
  { kind: "immich", metrics: ["photoCount", "videoCount", "userCount", "totalLibraryUsageInBytes"] },
  { kind: "karakeep", metrics: ["bookmarks", "favorites", "archived", "highlights", "lists", "tags"] },
  { kind: "mealie", metrics: ["recipes", "users", "categories", "tags"] },
  { kind: "spoolman", metrics: ["spools", "remainingWeight"] },
] as const satisfies readonly { kind: IntegrationKind; metrics: readonly string[] }[];

type DemoStatsIntegrationKind = (typeof demoStatsSources)[number]["kind"];

const buildDemoWidgets = (
  appIds: string[],
  customWidgetDefinitionId: string,
  statsIntegrationIds: Record<DemoStatsIntegrationKind, string>,
): DemoWidget[] => [
  // Daily focus
  { kind: "calendar", xOffset: 0, yOffset: 0, width: 2, height: 2, needsIntegration: true },
  {
    kind: "weather",
    xOffset: 2,
    yOffset: 0,
    width: 2,
    height: 2,
    needsIntegration: false,
    options: {
      location: { name: "Paris", latitude: 48.85341, longitude: 2.3488 },
      hasForecast: false,
      showHumidity: false,
      showCurrentWindSpeed: false,
      showCity: true,
      animateIcons: false,
    },
  },
  {
    kind: "clock",
    xOffset: 4,
    yOffset: 0,
    width: 1,
    height: 2,
    needsIntegration: false,
    options: { customTitleToggle: false, showDate: false, customTimeFormat: "HH:mm" },
  },
  {
    kind: "timer",
    xOffset: 5,
    yOffset: 0,
    width: 2,
    height: 1,
    needsIntegration: false,
    options: {
      mode: "pomodoro",
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      sessionsBeforeLongBreak: 4,
      autoStartBreaks: false,
      autoStartFocus: false,
    },
  },
  {
    kind: "airQuality",
    xOffset: 5,
    yOffset: 1,
    width: 2,
    height: 1,
    needsIntegration: false,
    options: {
      location: { name: "Paris", latitude: 48.85341, longitude: 2.3488 },
      aqiStandard: "european",
      showUv: false,
      showPollutants: false,
      showPollen: false,
    },
  },
  { kind: "downloads", xOffset: 7, yOffset: 0, width: 5, height: 2, needsIntegration: true },

  // Homarr workspace
  {
    kind: "notebook",
    xOffset: 0,
    yOffset: 2,
    width: 5,
    height: 3,
    needsIntegration: false,
    options: {
      showToolbar: false,
      allowReadOnlyCheck: true,
      content: `
<p style="text-align: center"><img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr-wordmark-light.svg" width="28%"></p>
<h2>Welcome to <strong><span style="color: rgb(250, 82, 82)">Homarr demo</span></strong></h2>
<p>Your apps, live integrations, and notes, all in one place.</p>
<p><strong>Hold Shift over any widget</strong> to reveal its advanced view. You can also rearrange the board or edit this notebook.</p>
<p><a href="https://homarr.dev/docs/getting-started" target="_blank" rel="noopener noreferrer">Get started with Homarr</a></p>
`,
    },
  },
  { kind: "beszelSystemGrid", xOffset: 5, yOffset: 2, width: 4, height: 3, needsIntegration: true },
  { kind: "assistant", xOffset: 9, yOffset: 2, width: 3, height: 3, needsIntegration: false },

  // Operations center
  { kind: "mediaRequests-requestList", xOffset: 0, yOffset: 5, width: 3, height: 2, needsIntegration: true },
  { kind: "mediaMissing", xOffset: 9, yOffset: 5, width: 3, height: 2, needsIntegration: true },
  { kind: "mediaServer", xOffset: 0, yOffset: 7, width: 3, height: 2, needsIntegration: true },
  { kind: "mediaRequests-requestStats", xOffset: 9, yOffset: 7, width: 3, height: 2, needsIntegration: true },
  {
    kind: "rssFeed",
    xOffset: 0,
    yOffset: 9,
    width: 3,
    height: 2,
    needsIntegration: false,
    options: {
      feedUrls: ["https://selfh.st/rss/", "https://hnrss.org/newest?q=self-hosted"],
      maximumAmountPosts: 12,
      textLinesClamp: 2,
      hideDescription: true,
    },
  },
  { kind: "indexerManager", xOffset: 9, yOffset: 9, width: 3, height: 2, needsIntegration: true },

  // Infrastructure and activity
  { kind: "dockerContainers", xOffset: 0, yOffset: 11, width: 4, height: 3, needsIntegration: false },
  { kind: "mediaReleases", xOffset: 4, yOffset: 11, width: 4, height: 3, needsIntegration: true },

  // Community Workshop
  {
    kind: "customApi",
    xOffset: 8,
    yOffset: 11,
    width: 4,
    height: 3,
    needsIntegration: false,
    options: { definitionId: customWidgetDefinitionId, refreshInterval: 300 },
  },

  // Network and health
  {
    kind: "healthMonitoring",
    xOffset: 3,
    yOffset: 5,
    width: 6,
    height: 2,
    needsIntegration: true,
  },
  {
    kind: "dnsHoleSummary",
    xOffset: 3,
    yOffset: 7,
    width: 3,
    height: 2,
    needsIntegration: true,
    options: { layout: "grid", usePiHoleColors: false },
  },
  {
    kind: "beszelSystemStats",
    xOffset: 6,
    yOffset: 7,
    width: 3,
    height: 2,
    needsIntegration: true,
  },
  { kind: "notifications", xOffset: 3, yOffset: 9, width: 2, height: 2, needsIntegration: true },
  { kind: "beszelAlerts", xOffset: 5, yOffset: 9, width: 4, height: 2, needsIntegration: true },

  // Infrastructure detail
  { kind: "beszelSystemTable", xOffset: 0, yOffset: 14, width: 12, height: 3, needsIntegration: true },
  {
    kind: "networkControllerStatus",
    xOffset: 0,
    yOffset: 17,
    width: 3,
    height: 2,
    needsIntegration: true,
    options: { content: "wifi" },
  },
  { kind: "ups", xOffset: 3, yOffset: 17, width: 3, height: 2, needsIntegration: true },
  {
    kind: "bookmarks",
    xOffset: 6,
    yOffset: 17,
    width: 4,
    height: 2,
    needsIntegration: false,
    options: { title: "Launchpad", layout: "grid", items: appIds.slice(0, 6), openNewTab: true },
  },
  {
    kind: "countdown",
    xOffset: 10,
    yOffset: 17,
    width: 2,
    height: 2,
    needsIntegration: false,
    options: {
      events: [
        {
          id: "demo-new-year",
          label: "New year 2030",
          targetUtc: "2030-01-01T00:00:00.000Z",
          startUtc: "2026-01-01T00:00:00.000Z",
          timeZone: "Europe/Paris",
          recurrence: "none",
        },
      ],
      showProgress: true,
      showSeconds: false,
    },
  },
  // Everyday tools
  { kind: "stockPrice", xOffset: 0, yOffset: 19, width: 2, height: 2, needsIntegration: false },
  { kind: "releases", xOffset: 2, yOffset: 19, width: 2, height: 2, needsIntegration: true },
  {
    kind: "timetable",
    xOffset: 4,
    yOffset: 19,
    width: 2,
    height: 2,
    needsIntegration: false,
    options: { baseUrl: "https://search.ch", station: { value: "8507000", label: "Bern" } },
  },
  { kind: "uptimeKuma", xOffset: 6, yOffset: 19, width: 3, height: 2, needsIntegration: true },
  { kind: "firewall", xOffset: 9, yOffset: 19, width: 3, height: 2, needsIntegration: true },

  // Integration showcase
  {
    kind: "immich-albumCarousel",
    xOffset: 0,
    yOffset: 21,
    width: 3,
    height: 3,
    needsIntegration: true,
    options: { albumId: "demo-paris", rotationIntervalSeconds: 8, showPhotoInfo: true, randomizePhotos: false },
  },
  { kind: "coolify", xOffset: 3, yOffset: 21, width: 3, height: 3, needsIntegration: true },
  { kind: "systemResources", xOffset: 6, yOffset: 21, width: 3, height: 3, needsIntegration: true },
  { kind: "systemDisks", xOffset: 9, yOffset: 21, width: 3, height: 3, needsIntegration: true },

  { kind: "immich-serverStats", xOffset: 0, yOffset: 24, width: 2, height: 3, needsIntegration: true },
  { kind: "paperlessNgx", xOffset: 2, yOffset: 24, width: 2, height: 3, needsIntegration: true },
  { kind: "patchmon", xOffset: 4, yOffset: 24, width: 2, height: 3, needsIntegration: true },
  {
    kind: "speedtestTracker",
    xOffset: 6,
    yOffset: 24,
    width: 4,
    height: 3,
    needsIntegration: true,
    options: { showLatestResult: true, showStats: true, showRecentResults: false, showPingGraph: false },
  },
  { kind: "audioStats", xOffset: 10, yOffset: 24, width: 2, height: 3, needsIntegration: true },

  { kind: "vpn", xOffset: 0, yOffset: 27, width: 3, height: 2, needsIntegration: true },
  { kind: "bazarr", xOffset: 3, yOffset: 27, width: 3, height: 2, needsIntegration: true },
  { kind: "archiveTeamWarrior", xOffset: 6, yOffset: 27, width: 3, height: 2, needsIntegration: true },
  { kind: "wud", xOffset: 9, yOffset: 27, width: 3, height: 2, needsIntegration: true },

  {
    kind: "anchorNote",
    xOffset: 0,
    yOffset: 29,
    width: 2,
    height: 2,
    needsIntegration: true,
    options: { noteId: "homarr-demo-note", showTitle: true, showUpdatedAt: true },
  },
  { kind: "tracearr", xOffset: 2, yOffset: 29, width: 4, height: 2, needsIntegration: true },
  { kind: "traefik", xOffset: 6, yOffset: 29, width: 6, height: 2, needsIntegration: true },

  {
    kind: "umami",
    xOffset: 0,
    yOffset: 31,
    width: 12,
    height: 2,
    needsIntegration: true,
    options: { websiteId: "homarr-demo", timeFrame: "24h", viewMode: "chart", chartType: "bar" },
  },

  // One grid demonstrates how real integrations can share a single operational overview.
  {
    kind: "stats",
    xOffset: 0,
    yOffset: 33,
    width: 12,
    height: 5,
    needsIntegration: false,
    integrationIds: demoStatsSources.map(({ kind }) => statsIntegrationIds[kind]),
    options: {
      table: false,
      rows: false,
      entries: demoStatsSources.flatMap(({ kind, metrics }) =>
        metrics.map((metric) => ({
          id: `demo-stats-${kind}-${metric}`,
          integrationId: statsIntegrationIds[kind],
          metric,
          label: "",
          hidden: false,
          compact: false,
        })),
      ),
    },
  },

  // Right app rail
  ...appIds.map(
    (appId, index): DemoWidget => ({
      kind: "app",
      section: "right",
      xOffset: 0,
      yOffset: index,
      width: 1,
      height: 1,
      needsIntegration: false,
      options: { appId, openIn: "newTab", showTitle: true, pingEnabled: false },
    }),
  ),
];

const appNames = [
  "SONARR",
  "RADARR",
  "PLEX",
  "JELLYFIN",
  "PROXMOX",
  "PIHOLE",
  "GRAFANA",
  "PORTAINER",
  "UPTIMEKUMA",
  "NEXTCLOUD",
  "QBITTORRENT",
  "OVERSEERR",
];
const statsIntegrationIds = Object.fromEntries(
  demoStatsSources.map(({ kind }) => [kind, `__STATS_${kind.toUpperCase().replace(/[^A-Z0-9]/g, "")}__`]),
) as Record<DemoStatsIntegrationKind, string>;
const currentWidgets = buildDemoWidgets(
  appNames.map((name) => `__APP_${name}__`),
  "__CUSTOM_WIDGET__",
  statsIntegrationIds,
);
export const demoWidgets: Record<string, DemoWidget> = Object.fromEntries(
  currentWidgets.map((widget) => {
    if (widget.kind === "app") {
      const appName = appNames[currentWidgets.filter(({ kind }) => kind === "app").indexOf(widget)];
      return [`app-${appName}`, { ...widget, options: { ...widget.options, layout: "row" } }];
    }
    return [widget.kind, widget];
  }),
);
const getDemoWidget = (key: string) => {
  const widget = demoWidgets[key];
  if (!widget) throw new Error(`Unknown current demo widget: ${key}`);
  return widget;
};

demoWidgets["smartHome-controls"] = {
  kind: "smartHome-controls",
  xOffset: 0,
  yOffset: 0,
  width: 8,
  height: 3,
  smallScreenHeight: 4,
  needsIntegration: true,
  options: {
    presentation: "controlPanel",
    title: "Home controls",
    blocks: [
      "live:__MOCK__:entity:light.living_room_ceiling",
      "live:__MOCK__:entity:climate.living_room",
      "live:__MOCK__:entity:cover.living_room_blinds",
      "live:__MOCK__:entity:media_player.living_room_tv",
      "live:__MOCK__:entity:light.kitchen_counter",
      "live:__MOCK__:entity:switch.coffee_machine",
      "live:__MOCK__:entity:sensor.kitchen_temperature",
      "live:__MOCK__:entity:sensor.kitchen_humidity",
    ],
    roomDomains: ["light", "climate", "cover", "media_player", "switch", "sensor"],
    excludedEntityIds: [],
    showSummary: false,
    readOnly: false,
    controlSize: "auto",
    palette: "boring",
  },
};
// Show the useful measures without packing every Beszel capability into the overview.
getDemoWidget("beszelSystemGrid").options = {
  statusFilter: "up",
  fahrenheit: false,
  showCpu: true,
  showMemory: true,
  showDisk: true,
  showGpu: false,
  showLoadAvg: false,
  showNet: true,
  showTemp: false,
  showBattery: false,
  showServices: false,
  showUptime: false,
  showAgent: false,
};
getDemoWidget("dnsHoleSummary").options = { layout: "grid", usePiHoleColors: false };
getDemoWidget("downloads").options = {
  columns: ["name", "progress", "downSpeed", "state"],
  defaultSort: "progress",
  descendingDefaultSort: true,
  limitPerIntegration: 6,
};
export const place = (
  key: string,
  xOffset: number,
  yOffset: number,
  width: number,
  height: number,
  options?: Record<string, unknown>,
): DemoWidget => {
  const original = getDemoWidget(key);
  return { ...original, xOffset, yOffset, width, height, options: { ...original.options, ...options } };
};
