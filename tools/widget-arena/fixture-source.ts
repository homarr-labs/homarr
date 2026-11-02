import { customWidgetPreviewDefinitionSchema } from "../../packages/custom-widgets/src/core/custom-jsx-schema";
import type { HomarrCustomWidgetV2Input } from "../../packages/custom-widgets/src/core/custom-jsx-schema";
import type { ArenaCase } from "../../apps/nextjs/src/app/[locale]/manage/custom-widgets/arena/_arena-contract";

const clock = "2026-11-02T12:00:00Z";
const image = "/images/demo-dashboard-background.svg";
type RequestMap = HomarrCustomWidgetV2Input["requests"];
type OptionMap = NonNullable<HomarrCustomWidgetV2Input["options"]>;

function fixture(
  id: string,
  title: string,
  prompt: string,
  responses: Record<string, unknown>,
  emptyResponses: Record<string, unknown>,
  requests: RequestMap,
  options: OptionMap = {},
  manualParams: ArenaCase["manualParams"] = {},
  refreshSeconds: number | null = null,
): ArenaCase {
  const definition = customWidgetPreviewDefinitionSchema.parse({
    $schema: "homarr-custom-widget-v2",
    name: title,
    description: "Synthetic arena fixture; all requests and controls are simulated.",
    sources: { default: { name: "Arena fixture", baseUrl: "https://arena.example.com", auth: "none" } },
    requests,
    options,
    template: `<Stack p="md"><Text>${title}</Text><Text>Synthetic fixture simulation</Text></Stack>`,
  });
  const defaultOptions: ArenaCase["defaultOptions"] = {};
  for (const [key, option] of Object.entries(definition.options)) {
    if (["string", "number", "boolean"].includes(typeof option.default)) {
      const value = option.default;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
        defaultOptions[key] = value;
    }
  }
  return {
    id,
    title,
    prompt,
    definition,
    responses,
    emptyResponses,
    manualParams,
    defaultOptions,
    simulation: {
      clock,
      refreshSeconds,
      note: "Fixture simulation only; refresh intent is not live polling. No source HTTP or mutations.",
    },
  };
}

export function createFixtures(): ArenaCase[] {
  return [
    fixture(
      "ntfy",
      "Notifications",
      "Show newest-first notifications filtered by configured topic. Include title, message, priority, timestamp, local placeholder images and each action label. Invoke notificationAction with id and actionId through a confirmed ActionButton; never follow external links. Keep refresh and all query states.",
      {
        notifications: {
          messages: [
            {
              id: "n3",
              topic: "homelab",
              title: "Backup completed",
              message: "Nightly archive verified.",
              priority: 3,
              time: "2026-11-02T11:58:00Z",
              image,
              actions: [{ id: "ack", label: "Acknowledge" }],
            },
            {
              id: "n2",
              topic: "homelab",
              title: "Front gate",
              message: "Parcel detected.",
              priority: 4,
              time: "2026-11-02T11:42:00Z",
              image,
              actions: [{ id: "dismiss", label: "Dismiss" }],
            },
            {
              id: "n1",
              topic: "homelab",
              title: "Maintenance",
              message: "Storage check scheduled.",
              priority: 2,
              time: "2026-11-02T10:00:00Z",
              actions: [],
            },
          ],
        },
        notificationAction: { accepted: true, message: "Simulated acknowledgement" },
      },
      { notifications: { messages: [] }, notificationAction: { accepted: true } },
      {
        notifications: { path: "/fixtures/notifications", query: { topic: { $option: "topic" } } },
        notificationAction: {
          kind: "action",
          method: "POST",
          path: "/fixtures/notifications/{param:id}/actions/{param:actionId}",
          confirmation: "Simulate this notification action?",
          invalidates: ["notifications"],
        },
      },
      { topic: { label: "Topic", control: "text", default: "homelab" } },
      { notificationAction: { id: "n3", actionId: "ack" } },
    ),
    fixture(
      "currency",
      "Currency rates",
      "Display EUR-base currency rates with configured decimal precision and symbols/codes, as-of date, compact responsive layout and no unnecessary fixed-height blank area. Preserve refresh and every query state.",
      {
        rates: {
          base: "EUR",
          asOf: "2026-11-02T12:00:00Z",
          rates: [
            { code: "USD", symbol: "$", rate: 1.08723 },
            { code: "GBP", symbol: "£", rate: 0.84267 },
            { code: "JPY", symbol: "¥", rate: 164.324 },
          ],
        },
      },
      { rates: { base: "EUR", asOf: clock, rates: [] } },
      { rates: { path: "/fixtures/rates", query: { base: { $option: "base" } } } },
      {
        base: { label: "Base currency", control: "select", default: "EUR", choices: [{ label: "EUR", value: "EUR" }] },
        decimals: { label: "Decimal places", control: "number", default: 2, min: 0, max: 4 },
      },
    ),
    fixture(
      "dog-facts",
      "Dog facts",
      "Show the current dog fact with a clearly labeled manual New fact SubFetch requestId=nextFact (no params). Its child receives {fact}. Handle initial fact query states and the manual helper's loading/error/empty result. Never call a public dog API.",
      {
        fact: { fact: "Dogs have a highly developed sense of smell." },
        nextFact: { fact: "Dogs communicate using posture as well as sound." },
      },
      { fact: { fact: "" }, nextFact: { fact: "" } },
      {
        fact: { path: "/fixtures/dog-fact" },
        nextFact: { path: "/fixtures/dog-fact/next", trigger: "manual", cacheSeconds: 0 },
      },
    ),
    fixture(
      "ha-cameras",
      "Home cameras",
      "Display selected camera placeholders in the configured grid/stack layout, with camera names, online state and capture timestamps. options.cameraIds is comma-separated persistent installation configuration, not temporary inputs; options.layout selects grid/stack. Data is adapted synthetic JSON and a local illustration, NOT live Home Assistant streams or camera feeds. Include refresh and query states.",
      {
        cameras: {
          cameras: [
            { id: "entry", name: "Entry", online: true, capturedAt: "2026-11-02T11:59:00Z", image },
            { id: "garden", name: "Garden", online: false, capturedAt: "2026-11-02T11:50:00Z", image },
          ],
        },
      },
      { cameras: { cameras: [] } },
      { cameras: { path: "/fixtures/cameras", query: { ids: { $option: "cameraIds" } } } },
      {
        cameraIds: { label: "Camera IDs", control: "text", default: "entry,garden" },
        layout: {
          label: "Layout",
          control: "select",
          default: "grid",
          choices: [
            { label: "Grid", value: "grid" },
            { label: "Stack", value: "stack" },
          ],
        },
      },
    ),
    fixture(
      "game-server",
      "Game server",
      "Emphasize the server name and supplied gamepad icon, display fictional server IP/address, online status, current/max players, and every player's actual supplied name and ping in ms. Omit map name and country markers; do not add a game/map headline. Do not invent player names from counts. Balance spacing at both sizes, with refresh/loading/error/empty.",
      {
        server: {
          name: "Arena survival",
          address: "192.0.2.42:25565",
          icon: "device-gamepad-2",
          online: true,
          maxPlayers: 16,
          players: [
            { name: "Fern", ping: 23 },
            { name: "Birch", ping: 47 },
            { name: "Moss", ping: 81 },
          ],
        },
      },
      {
        server: {
          name: "Arena survival",
          address: "192.0.2.42:25565",
          icon: "device-gamepad-2",
          online: true,
          maxPlayers: 16,
          players: [],
        },
      },
      { server: { path: "/fixtures/game-server" } },
    ),
    fixture(
      "sonarr",
      "Upcoming episodes",
      "Combine date-range episode status with weekly day selection in this SAME case. Show series/episode names, season/episode numbers, air date and downloaded/missing status. start/end installation options define the week; offer a bound day Select and a manual SubFetch requestId=episodesForDay params={{day: inputs.day ?? options.start}}. Its result envelope is {episodes:[...]}. Include initial full-week list, day result and query states; simulation only.",
      {
        episodes: {
          episodes: [
            {
              id: "e1",
              series: "The Observatory",
              title: "First light",
              season: 2,
              episode: 4,
              airDate: "2026-11-02T20:00:00Z",
              status: "downloaded",
            },
            {
              id: "e2",
              series: "Garden paths",
              title: "Rain",
              season: 1,
              episode: 7,
              airDate: "2026-11-04T19:00:00Z",
              status: "missing",
            },
          ],
        },
        episodesForDay: {
          episodes: [
            {
              id: "e1",
              series: "The Observatory",
              title: "First light",
              season: 2,
              episode: 4,
              airDate: "2026-11-02T20:00:00Z",
              status: "downloaded",
            },
          ],
        },
      },
      { episodes: { episodes: [] }, episodesForDay: { episodes: [] } },
      {
        episodes: { path: "/fixtures/episodes", query: { start: { $option: "start" }, end: { $option: "end" } } },
        episodesForDay: { path: "/fixtures/episodes/day", trigger: "manual", query: { day: { $param: "day" } } },
      },
      {
        start: { label: "Start date", control: "date", default: "2026-11-02" },
        end: { label: "End date", control: "date", default: "2026-11-08" },
      },
      { episodesForDay: { day: "2026-11-02" } },
    ),
    fixture(
      "your-spotify",
      "Listening statistics",
      "Exactly two primary statistics labeled Songs listened and Listening time. Convert listeningSeconds to minutes by /60 and show exactly one decimal with min unit; do not show seconds as minutes or add unrelated headline stats. Include as-of and explicit Hourly refresh — fixture simulation intent, not live polling. Handle refresh/loading/error/empty.",
      { statistics: { songsListened: 137, listeningSeconds: 25865, asOf: clock, hasData: true } },
      { statistics: { songsListened: 0, listeningSeconds: 0, asOf: clock, hasData: false } },
      { statistics: { path: "/fixtures/listening", cacheSeconds: 3600 } },
      {},
      {},
      3600,
    ),
    fixture(
      "wireguard",
      "WireGuard peers",
      "Show peer name, connection state, latest handshake, transferred bytes and refresh intent. Preserve source timestamps exactly or format with documented UTC only; never invent a local timezone offset. Fixture timezone is UTC. Distinguish never-handshaken peers. Display automatic-refresh intent as simulated, not a live timer. Include every query state.",
      {
        peers: {
          timezone: "UTC",
          asOf: clock,
          peers: [
            {
              id: "p1",
              name: "Laptop",
              connected: true,
              latestHandshake: "2026-11-02T11:59:20Z",
              receivedBytes: 1843200,
              sentBytes: 409600,
            },
            { id: "p2", name: "Tablet", connected: false, latestHandshake: null, receivedBytes: 0, sentBytes: 0 },
          ],
        },
      },
      { peers: { timezone: "UTC", asOf: clock, peers: [] } },
      { peers: { path: "/fixtures/wireguard", cacheSeconds: 30 } },
      {},
      {},
      30,
    ),
    fixture(
      "netronome",
      "Speed history",
      "Visualize chronological download/upload Mbps history, latency ms and measured timestamps with legible units and a legend. Include current values and an actual supported chart or clear proportional bars, not invented chart components. Refresh and loading/error/empty required.",
      {
        history: {
          samples: [
            { measuredAt: "2026-11-02T09:00:00Z", downloadMbps: 850, uploadMbps: 210, latencyMs: 8 },
            { measuredAt: "2026-11-02T10:00:00Z", downloadMbps: 720, uploadMbps: 195, latencyMs: 14 },
            { measuredAt: "2026-11-02T11:00:00Z", downloadMbps: 925, uploadMbps: 230, latencyMs: 7 },
          ],
        },
      },
      { history: { samples: [] } },
      { history: { path: "/fixtures/speed-history" } },
    ),
    fixture(
      "proxmox-security",
      "Security overview",
      "Create one fictional Proxmox node security status card from data.security.status. Show updated timestamp, failed/successful SSH logins over 7 days, SSH password authentication, failed Proxmox UI logins over 7 days, root 2FA, firewall service and Homarr firewall, Tailscale state/online peers, rpcbind service, pending Nexus and Homarr CT updates, listening ports, uptime days and PVE version. Preserve every supplied field with readable labels and meaningful status badges. Distinguish unknown/null from healthy/false; empty status is null. Do not invent remediation actions. Keep refresh and all query states.",
      {
        security: {
          status: {
            updated: "2026-11-02T11:30:00Z",
            ssh_failed_7d: 12,
            ssh_success_7d: 28,
            ssh_password_auth: false,
            proxmox_ui_failed_7d: 3,
            root_2fa_enabled: true,
            firewall_running: true,
            homarr_firewall_on: true,
            tailscale_state: "Running",
            tailscale_peers_online: 4,
            rpcbind_running: false,
            updates_nexus: 2,
            updates_homarr_ct: 1,
            listening_ports: [22, 443, 8006],
            uptime_days: 18.4,
            pve_version: "9.0.1",
          },
        },
      },
      { security: { status: null } },
      { security: { path: "/fixtures/security" } },
    ),
    fixture(
      "monthly-calendar",
      "November calendar",
      "Render November 2026 as a Monday-first month grid including weekday labels, numbered dates and readable event NAMES in their cells, not dots alone. Today is November 2 from the frozen clock. Synthetic JSON adaptation, NOT iCal parsing. data.calendar.days supplies all 42 grid cells (including adjacent months) and per-day event lists. Handle no events distinctly from loading/error and preserve month context.",
      { calendar: { month: "November 2026", today: "2026-11-02", days: calendarDays(false) } },
      { calendar: { month: "November 2026", today: "2026-11-02", days: calendarDays(true) } },
      { calendar: { path: "/fixtures/calendar", query: { month: { $option: "month" } } } },
      { month: { label: "Month", control: "text", default: "2026-11" } },
    ),
    fixture(
      "event-feed",
      "Activity feed",
      "Display QueueItemDeleted, SearchTriggered and removal activity newest-first with event name, description, category/status, timestamp and relative age using the frozen response now value (not Date.now). Include filter Select bind=category with all/queue/search/removal choices and manual SubFetch requestId=filteredEvents params={{category: inputs.category ?? 'all'}}; render its {events:[...],now} result. Keep full initial feed, manual filter and every query state.",
      {
        events: { now: clock, events: activityEvents() },
        filteredEvents: { now: clock, events: activityEvents().slice(0, 1) },
      },
      { events: { now: clock, events: [] }, filteredEvents: { now: clock, events: [] } },
      {
        events: { path: "/fixtures/events" },
        filteredEvents: {
          path: "/fixtures/events/filter",
          trigger: "manual",
          query: { category: { $param: "category" } },
        },
      },
      {},
      { filteredEvents: { category: "queue" } },
    ),
  ];
}

function activityEvents() {
  return [
    {
      id: "a3",
      name: "QueueItemDeleted",
      description: "Fictional episode download removed from the queue.",
      category: "queue",
      status: "success",
      timestamp: "2026-11-02T11:55:00Z",
    },
    {
      id: "a2",
      name: "SearchTriggered",
      description: "Manual search requested for The Observatory.",
      category: "search",
      status: "info",
      timestamp: "2026-11-02T11:30:00Z",
    },
    {
      id: "a1",
      name: "EpisodeFileRemoved",
      description: "Fictional superseded episode file removed.",
      category: "removal",
      status: "info",
      timestamp: "2026-11-02T10:15:00Z",
    },
  ];
}

function calendarDays(empty: boolean) {
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 26 + index));
    const iso = date.toISOString().slice(0, 10);
    const events: { name: string; time: string }[] = [];
    if (!empty && iso === "2026-11-02") events.push({ name: "Team planning", time: "09:00" });
    if (!empty && iso === "2026-11-12") events.push({ name: "Storage maintenance", time: "18:00" });
    if (!empty && iso === "2026-11-21") events.push({ name: "Community meetup", time: "14:00" });
    return { date: iso, day: date.getUTCDate(), inMonth: date.getUTCMonth() === 10, events };
  });
}
