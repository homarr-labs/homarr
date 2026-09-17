import type { WidgetKind } from "@homarr/definitions";

/**
 * Options are intentionally shared with the rich demo's stable public fixtures.
 * Integration-backed widgets use the mock integration at seed time; these
 * options select representative states where a widget has meaningful choices.
 */
export const WIDGET_UI_AUDIT_OPTIONS: Partial<Record<WidgetKind, Record<string, unknown>>> = {
  clock: { customTitleToggle: false, showDate: false, customTimeFormat: "HH:mm" },
  weather: {
    location: { name: "Paris", latitude: 48.85341, longitude: 2.3488 },
    hasForecast: false,
    showHumidity: false,
    showCurrentWindSpeed: false,
    showCity: true,
    animateIcons: false,
  },
  airQuality: {
    location: { name: "Paris", latitude: 48.85341, longitude: 2.3488 },
    aqiStandard: "european",
    showUv: false,
    showPollutants: false,
    showPollen: false,
  },
  timer: {
    mode: "pomodoro",
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
  },
  countdown: {
    events: [
      {
        id: "widget-ui-audit-new-year",
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
  notebook: {
    showToolbar: false,
    allowReadOnlyCheck: true,
    content:
      "<h2>Homarr widget UI audit</h2><p>Resize this card to compare the notebook layout at every supported grid size.</p>",
  },
  rssFeed: {
    feedUrls: ["https://selfh.st/rss/", "https://hnrss.org/newest?q=self-hosted"],
    maximumAmountPosts: 12,
    textLinesClamp: 2,
    hideDescription: true,
  },
  iframe: {
    embedUrl: "/images/demo-dashboard-background.svg",
    allowScrolling: false,
  },
  video: {
    feedUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    hasAutoPlay: false,
    isMuted: true,
    hasControls: true,
  },
  stockPrice: { stock: "AAPL", timeRange: "1mo", timeInterval: "1d", showDetails: true },
  minecraftServerStatus: { title: "Hypixel", domain: "hypixel.net", isBedrockServer: false },
  timetable: { baseUrl: "https://search.ch", station: { value: "8507000", label: "Bern" } },
  bookmarks: { title: "Launchpad", layout: "grid", openNewTab: true },
  dnsHoleSummary: { layout: "grid", usePiHoleColors: false },
  networkControllerStatus: { content: "wifi" },
  "smartHome-entityState": { entityId: "sensor.homarr_demo", displayName: "Demo environment", entityUnit: "online" },
  "smartHome-executeAutomation": { automationId: "automation.homarr_demo", displayName: "Run demo routine" },
  "immich-albumCarousel": {
    albumId: "demo-paris",
    rotationIntervalSeconds: 8,
    showPhotoInfo: true,
    randomizePhotos: false,
  },
  speedtestTracker: { showLatestResult: true, showStats: true, showRecentResults: false, showPingGraph: false },
  anchorNote: { noteId: "homarr-demo-note", showTitle: true, showUpdatedAt: true },
  umami: { websiteId: "homarr-demo", timeFrame: "24h", viewMode: "chart", chartType: "bar" },
};
