import { httpIntegrationKinds, integrationDefs } from "@homarr/definitions/integration";
import type { HttpIntegrationKind } from "@homarr/definitions/integration";

import type { CustomWidgetAiEvaluationCase, CustomWidgetAiIntegrationFixture } from "./ai-evaluation-cases";

interface UniversalIntegrationContract {
  kind: HttpIntegrationKind;
  documentationUrl: string;
  method?: "GET" | "POST";
  path: string;
  query?: Record<string, string>;
  body?: Record<string, string>;
  response: unknown;
  responsePaths: readonly string[];
  notes: string;
  limitation?: string;
}

const contracts: readonly UniversalIntegrationContract[] = [
  {
    kind: "jellystat",
    documentationUrl: "https://github.com/CyferShepard/Jellystat/wiki",
    path: "/stats/getViewsByLibraryType",
    query: { days: "30" },
    response: { Audio: 212, Movie: 84, Series: 391, Other: 3 },
    responsePaths: ["Audio", "Movie", "Series", "Other"],
    notes:
      "GET /stats/getViewsByLibraryType with days=30 returns a direct object with numeric Audio, Movie, Series, and Other play counts. The saved integration supplies X-API-Token authentication.",
  },
  {
    kind: "scrutiny",
    documentationUrl: "https://github.com/AnalogJ/scrutiny/blob/master/docs/API.md",
    path: "/api/summary",
    response: {
      data: {
        summary: {
          disk1: { device: { device_name: "/dev/sda", model_name: "IronWolf", archived: false, device_status: 0 } },
          disk2: { device: { device_name: "/dev/sdb", model_name: "Archive", archived: false, device_status: 2 } },
        },
      },
    },
    responsePaths: ["data.summary"],
    notes:
      "GET /api/summary returns data.summary as an object keyed by device identity, not an array. Each entry has a device object; archived devices should be excluded and device_status must remain visibly distinguishable.",
  },
  {
    kind: "tubearchivist",
    documentationUrl: "https://docs.tubearchivist.com/api/",
    path: "/api/stats/video/",
    response: { doc_count: 2841, media_size: 987654321000, duration: 842311 },
    responsePaths: ["doc_count", "media_size", "duration"],
    notes:
      "GET /api/stats/video/ returns a direct statistics object including doc_count and deployment-version-dependent media_size and duration fields. The saved integration supplies Authorization: Token credentials.",
  },
  {
    kind: "frigate",
    documentationUrl: "https://docs.frigate.video/integrations/api/",
    path: "/api/stats",
    response: {
      cameras: { front: { camera_fps: 5, detection_fps: 2.1, process_fps: 5, skipped_fps: 0 } },
      detectors: { coral: { detection_start: 0, inference_speed: 8.4, pid: 140 } },
      service: { uptime: 86400, version: "0.16.2", latest_version: "0.16.2", storage: {} },
    },
    responsePaths: ["cameras", "detectors", "service"],
    notes:
      "GET /api/stats returns a direct object with dynamically keyed cameras and detectors plus service uptime/version. It is JSON telemetry; do not invent a live-stream URL or put credentials into browser media URLs.",
    limitation:
      "Authenticated live video is outside the JSON/text Custom Widget request pipeline; provide a useful metrics fallback.",
  },
  {
    kind: "komga",
    documentationUrl: "https://komga.org/docs/api/",
    path: "/api/v1/libraries",
    response: [
      { id: "library-1", name: "Comics", unavailable: false, root: "/data/comics" },
      { id: "library-2", name: "Offline", unavailable: true, root: "/mnt/offline" },
    ],
    responsePaths: [],
    notes:
      "GET /api/v1/libraries returns a direct array. Show library names and availability and bound the rendered list. The saved integration supplies X-API-Key authentication.",
  },
  {
    kind: "netalertx",
    documentationUrl: "https://github.com/jokob-sk/NetAlertX/tree/main/docs",
    path: "/devices/totals",
    response: ["42", 31, 0, "2", 3],
    responsePaths: [],
    notes:
      "GET /devices/totals returns a positional array: total devices at index 0, connected at 1, new devices at 3, and down alerts at 4. Values may be numbers or decimal strings. The saved integration supplies Bearer authentication.",
  },
  {
    kind: "romm",
    documentationUrl: "https://docs.romm.app/latest/developers/api/",
    path: "/api/stats",
    response: {
      PLATFORMS: 18,
      ROMS: 4200,
      SAVES: 392,
      STATES: 88,
      SCREENSHOTS: 1260,
      TOTAL_FILESIZE_BYTES: 987654321000,
    },
    responsePaths: ["PLATFORMS", "ROMS", "SAVES", "STATES", "SCREENSHOTS", "TOTAL_FILESIZE_BYTES"],
    notes:
      "GET /api/stats returns an uppercase direct object. File size can be FILESIZE or TOTAL_FILESIZE_BYTES across versions; handle both without fabricating zero.",
  },
  {
    kind: "mealie",
    documentationUrl: "https://docs.mealie.io/documentation/getting-started/api-usage/",
    path: "/api/households/mealplans/today",
    response: [
      {
        id: 1,
        date: "2026-09-21",
        entryType: "dinner",
        title: "",
        text: "",
        recipeId: "r1",
        recipe: { name: "Risotto", totalTime: "45 minutes", recipeServings: 4 },
      },
      {
        id: 2,
        date: "2026-09-21",
        entryType: "snack",
        title: "Use bananas",
        text: "Before tomorrow",
        recipeId: null,
        recipe: null,
      },
    ],
    responsePaths: [],
    notes:
      "GET /api/households/mealplans/today returns a direct array. Entries can be recipe-backed or text-only with recipe=null; preserve entryType and use title/text fallbacks.",
  },
  {
    kind: "unmanic",
    documentationUrl: "https://docs.unmanic.app/docs/development/api/",
    path: "/unmanic/api/v2/workers/status",
    response: {
      workers_status: [
        { id: "worker-1", idle: false },
        { id: "worker-2", idle: true },
      ],
    },
    responsePaths: ["workers_status"],
    notes:
      "GET /unmanic/api/v2/workers/status returns {workers_status:[...]}; each worker has an idle boolean. Show active versus idle workers and handle an empty list.",
  },
  {
    kind: "syncthingRelay",
    documentationUrl: "https://docs.syncthing.net/dev/relay.html",
    path: "/status",
    response: { numActiveSessions: 7, numConnections: 1894, bytesProxied: 9876543210, goVersion: "go1.25" },
    responsePaths: ["numActiveSessions", "numConnections", "bytesProxied"],
    notes:
      "GET /status returns a direct relay status object. Use numActiveSessions, numConnections, and bytesProxied, and format bytes rather than showing an unlabelled raw integer.",
  },
  {
    kind: "stash",
    documentationUrl: "https://docs.stashapp.cc/in-app-manual/graphql-api/",
    method: "POST",
    path: "/graphql",
    body: {
      query:
        "query { stats { scene_count scenes_size scenes_duration image_count images_size gallery_count performer_count studio_count tag_count } }",
    },
    response: {
      data: {
        stats: {
          scene_count: 123,
          scenes_size: 456789000,
          scenes_duration: 98765,
          image_count: 42,
          images_size: 1234000,
          gallery_count: 12,
          performer_count: 33,
          studio_count: 9,
          tag_count: 71,
        },
      },
    },
    responsePaths: ["data.stats"],
    notes:
      "POST /graphql with a JSON GraphQL query for stats returns {data:{stats:{scene_count,scenes_size,scenes_duration,image_count,images_size,gallery_count,performer_count,studio_count,tag_count}}}. The saved integration supplies ApiKey authentication. Treat GraphQL errors as failure, not empty data.",
  },
  {
    kind: "prometheus",
    documentationUrl: "https://prometheus.io/docs/prometheus/latest/querying/api/",
    path: "/api/v1/targets",
    response: {
      status: "success",
      data: {
        activeTargets: [
          { labels: { job: "node" }, health: "up", lastError: "" },
          { labels: { job: "api" }, health: "down", lastError: "connection refused" },
        ],
        droppedTargets: [],
      },
    },
    responsePaths: ["data.activeTargets"],
    notes:
      "GET /api/v1/targets returns a status envelope with data.activeTargets. Use health and labels.job, surface lastError for down targets, and do not map the outer object as a list.",
  },
  {
    kind: "netdata",
    documentationUrl: "https://learn.netdata.cloud/docs/developer-and-contributor-corner/rest-api/",
    path: "/api/v1/info",
    response: { version: "2.6.3", mirrored_hosts: ["node-a"], alarms: { normal: 20, warning: 2, critical: 1 } },
    responsePaths: ["alarms.warning", "alarms.critical"],
    notes:
      "GET /api/v1/info returns a direct object. Alarm counts are under alarms.warning and alarms.critical; both can be zero and must not be mistaken for missing data.",
  },
  {
    kind: "fileflows",
    documentationUrl: "https://fileflows.com/docs/api/",
    path: "/api/status",
    response: { queue: 14, processing: 3, processed: 9402, time: "18d 04:22" },
    responsePaths: ["queue", "processing", "processed", "time"],
    notes:
      "GET /api/status returns direct queue, processing, processed, and nullable time fields. Show a useful zero/empty state rather than treating zero as unavailable.",
  },
  {
    kind: "trilium",
    documentationUrl: "https://github.com/TriliumNext/Trilium/wiki/ETAPI",
    path: "/etapi/metrics",
    query: { format: "json" },
    response: {
      version: { app: "0.97.1" },
      database: { activeNotes: 8241 },
      statistics: { databaseSizeBytes: 987654321 },
    },
    responsePaths: ["version.app", "database.activeNotes", "statistics.databaseSizeBytes"],
    notes:
      "GET /etapi/metrics with format=json returns nested version.app, database.activeNotes, and statistics.databaseSizeBytes. The ETAPI token is inherited from the saved integration.",
  },
  {
    kind: "tandoor",
    documentationUrl: "https://docs.tandoor.dev/api/",
    path: "/api/space/",
    response: { count: 1, results: [{ id: 1, name: "Home", user_count: 4, recipe_count: 528 }] },
    responsePaths: ["results"],
    notes:
      "GET /api/space/ may return a paginated {results:[...]} envelope or a direct array across versions. Show the first space's name, user_count, and recipe_count and handle no spaces.",
  },
  {
    kind: "spoolman",
    documentationUrl: "https://donkie.github.io/Spoolman/",
    path: "/api/v1/spool",
    response: [
      {
        id: 1,
        archived: false,
        remaining_weight: 714.2,
        filament: { name: "PLA Galaxy", vendor: { name: "Prusament" } },
      },
      { id: 2, archived: false, remaining_weight: null, filament: { name: "PETG" } },
    ],
    responsePaths: [],
    notes:
      "GET /api/v1/spool returns a direct array. Exclude archived spools, keep nullable remaining_weight honest, and show a bounded material/vendor list with total known remaining weight.",
  },
  {
    kind: "miniflux",
    documentationUrl: "https://miniflux.app/docs/api.html",
    path: "/v1/feeds/counters",
    response: { reads: { "1": 34, "2": 81 }, unreads: { "1": 5, "2": 12 } },
    responsePaths: ["reads", "unreads"],
    notes:
      "GET /v1/feeds/counters returns reads and unreads as objects keyed by feed ID. Sum their numeric values and do not assume arrays. The saved integration supplies X-Auth-Token.",
  },
  {
    kind: "maintainerr",
    documentationUrl: "https://docs.maintainerr.info/",
    path: "/api/storage-metrics",
    response: {
      cleanupTotals: { itemsHandled: 144, episodesHandled: 120, moviesHandled: 24 },
      collectionSummary: { activeSizeBytes: 456789000000 },
    },
    responsePaths: ["cleanupTotals", "collectionSummary.activeSizeBytes"],
    notes:
      "GET /api/storage-metrics returns cleanupTotals and collectionSummary.activeSizeBytes. Format storage as bytes and distinguish items, episodes, and movies handled.",
  },
  {
    kind: "linkwarden",
    documentationUrl: "https://docs.linkwarden.app/api/introduction",
    path: "/api/v1/collections",
    response: {
      data: {
        collections: [
          { id: 1, name: "Research", _count: { links: 83 } },
          { id: 2, name: "Recipes", _count: { links: 21 } },
        ],
      },
    },
    responsePaths: ["data.collections"],
    notes:
      "GET /api/v1/collections can return {data:{collections:[...]}} as well as legacy envelopes. Each collection has _count.links. Render a bounded list and sum links without assuming response is a direct array.",
  },
  {
    kind: "karakeep",
    documentationUrl: "https://docs.karakeep.app/api/karakeep-api/",
    path: "/api/v1/users/me/stats",
    response: {
      numBookmarks: 842,
      numFavorites: 63,
      numArchived: 490,
      numHighlights: 94,
      numLists: 12,
      numTags: 77,
      bookmarkingActivity: { thisWeek: 14 },
    },
    responsePaths: ["numBookmarks", "numFavorites", "numArchived", "numHighlights", "numLists", "numTags"],
    notes:
      "GET /api/v1/users/me/stats returns a direct statistics object. Use numBookmarks, numFavorites, numArchived, numHighlights, numLists, and numTags; bookmarkingActivity is optional across versions.",
  },
  {
    kind: "healthchecks",
    documentationUrl: "https://healthchecks.io/docs/api/",
    path: "/api/v3/checks/",
    response: {
      checks: [
        { name: "Backups", slug: "backups", status: "up", last_ping: "2026-09-21T10:00:00Z" },
        { name: "Billing sync", slug: "billing", status: "grace", last_ping: null },
        { name: "Nightly import", slug: "import", status: "down", last_ping: "2026-09-20T01:00:00Z" },
      ],
    },
    responsePaths: ["checks"],
    notes:
      "GET /api/v3/checks/ returns {checks:[...]}. Status can be new, up, grace, down, or paused. Show a bounded operational list and treat paused separately rather than as down. The saved project key supplies X-Api-Key.",
  },
  {
    kind: "gatus",
    documentationUrl: "https://github.com/TwiN/gatus",
    path: "/api/v1/endpoints/statuses",
    response: {
      core: {
        name: "Core API",
        group: "services",
        results: [{ success: true, timestamp: "2026-09-21T18:00:00Z", duration: 21000000 }],
      },
      search: {
        name: "Search",
        group: "services",
        results: [{ success: false, timestamp: "2026-09-21T18:00:00Z", errors: ["timeout"] }],
      },
    },
    responsePaths: [],
    notes:
      "GET /api/v1/endpoints/statuses may return a record or an array. Each endpoint's newest state is results.at(-1); missing results means unknown. Show name/group, success, time, duration, and error context.",
  },
  {
    kind: "changedetection",
    documentationUrl: "https://changedetection.io/docs/api_v1/",
    path: "/api/v1/watch",
    response: {
      "watch-1": {
        title: "Product page",
        url: "https://example.test/product",
        last_changed: 1789945200,
        last_checked: 1789956000,
        viewed: false,
      },
      "watch-2": {
        title: "Docs",
        url: "https://example.test/docs",
        last_changed: 0,
        last_checked: 1789955900,
        viewed: true,
      },
    },
    responsePaths: [],
    notes:
      "GET /api/v1/watch returns an object keyed by watch UUID, not an array. last_changed and last_checked are Unix timestamps; a positive unviewed last_changed is a new diff. The saved integration supplies lowercase x-api-key.",
  },
  {
    kind: "caddy",
    documentationUrl: "https://caddyserver.com/docs/api#reverse-proxy-upstreams",
    path: "/reverse_proxy/upstreams",
    response: [
      { address: "10.0.0.10:3000", num_requests: 4, fails: 0 },
      { address: "10.0.0.11:3000", num_requests: 1, fails: 3 },
    ],
    responsePaths: [],
    notes:
      "GET /reverse_proxy/upstreams on Caddy's admin API returns a direct array with address, num_requests, and fails. The admin API is privileged; this widget must remain read-only and must not expose arbitrary config mutation.",
  },
  {
    kind: "slskd",
    documentationUrl: "https://github.com/slskd/slskd/blob/master/docs/config.md",
    path: "/api/v0/transfers/downloads",
    response: [
      {
        username: "listener",
        directories: [
          {
            directory: "Artist/Album",
            files: [
              {
                filename: "Artist\\Album\\track.flac",
                size: 44000000,
                bytesTransferred: 22000000,
                state: "InProgress",
                remainingTime: "00:02:12",
              },
            ],
          },
        ],
      },
    ],
    responsePaths: [],
    notes:
      "GET /api/v0/transfers/downloads returns a direct user array with nested directories and files. Filenames may contain backslashes and remainingTime can be absent. The saved integration supplies X-API-Key; keep this overview read-only.",
  },
  {
    kind: "sonarr",
    documentationUrl: "https://sonarr.tv/docs/api/",
    path: "/api/v3/series",
    response: [
      {
        id: 1,
        title: "Example Show",
        monitored: true,
        status: "continuing",
        network: "Example",
        statistics: {
          seasonCount: 3,
          episodeCount: 28,
          episodeFileCount: 25,
          percentOfEpisodes: 89.3,
          sizeOnDisk: 9876543210,
        },
      },
    ],
    responsePaths: [],
    notes:
      "GET /api/v3/series returns a direct array. Use title, monitored, status, network, and nullable statistics fields. Sonarr uses API v3 and the saved integration supplies X-Api-Key.",
  },
  {
    kind: "radarr",
    documentationUrl: "https://radarr.video/docs/api/",
    path: "/api/v3/movie",
    response: [
      {
        id: 1,
        title: "Example Film",
        year: 2026,
        monitored: true,
        status: "released",
        hasFile: true,
        sizeOnDisk: 12876543210,
        digitalRelease: null,
        physicalRelease: "2026-10-01T00:00:00Z",
      },
    ],
    responsePaths: [],
    notes:
      "GET /api/v3/movie returns a direct array. Use title/year, monitored, status, hasFile, sizeOnDisk, and nullable release dates. Radarr uses API v3 and the saved integration supplies X-Api-Key.",
  },
  {
    kind: "lidarr",
    documentationUrl: "https://lidarr.audio/docs/api/",
    path: "/api/v1/artist",
    response: [
      {
        id: 1,
        artistName: "Example Artist",
        monitored: true,
        status: "continuing",
        statistics: {
          albumCount: 8,
          trackCount: 102,
          trackFileCount: 98,
          percentOfTracks: 96.1,
          sizeOnDisk: 4567890123,
        },
      },
    ],
    responsePaths: [],
    notes:
      "GET /api/v1/artist returns a direct array. Use artistName, monitored, status, and nullable statistics. Lidarr uses API v1, not the Sonarr/Radarr v3 path.",
  },
  {
    kind: "readarr",
    documentationUrl: "https://github.com/Readarr/Readarr",
    path: "/api/v1/book",
    response: [
      {
        id: 1,
        title: "Example Book",
        monitored: true,
        releaseDate: "2026-01-05T00:00:00Z",
        statistics: { bookFileCount: 1, totalBookCount: 1, sizeOnDisk: 7340032, percentOfBooks: 100 },
        author: { authorName: "Example Author" },
      },
    ],
    responsePaths: [],
    notes:
      "GET /api/v1/book returns a direct array. Use title, author.authorName, monitored, releaseDate, and nullable statistics. Readarr uses API v1 and is retired, so show unavailable optional fields defensively.",
  },
  {
    kind: "prowlarr",
    documentationUrl: "https://prowlarr.com/docs/api/",
    path: "/api/v1/indexer",
    response: [
      {
        id: 1,
        name: "Indexer A",
        enable: true,
        protocol: "torrent",
        privacy: "private",
        priority: 25,
        appProfileId: 1,
      },
      { id: 2, name: "Indexer B", enable: false, protocol: "usenet", privacy: "public", priority: 50, appProfileId: 1 },
    ],
    responsePaths: [],
    notes:
      "GET /api/v1/indexer returns a direct array. Show name, enable, protocol, privacy, and priority. The saved integration supplies X-Api-Key; do not turn this read overview into test-all or mutation actions.",
  },
  {
    kind: "jellyseerr",
    documentationUrl: "https://docs.jellyseerr.dev/using-jellyseerr/api",
    path: "/api/v1/request",
    query: { take: "10", skip: "0", sort: "modified" },
    response: {
      pageInfo: { pages: 2, pageSize: 10, results: 18, page: 1 },
      results: [
        {
          id: 91,
          type: "movie",
          status: 2,
          createdAt: "2026-09-20T10:00:00Z",
          requestedBy: { displayName: "Alex" },
          media: { tmdbId: 603, mediaType: "movie", status: 4 },
        },
      ],
    },
    responsePaths: ["results", "pageInfo"],
    notes:
      "GET /api/v1/request with take=10, skip=0, sort=modified returns {pageInfo,results}. Request status is numeric; render a readable status and nested requestedBy/media fields. The saved integration supplies X-Api-Key.",
  },
  {
    kind: "seerr",
    documentationUrl: "https://docs.seerr.dev/using-seerr/api",
    path: "/api/v1/request",
    query: { take: "10", skip: "0", sort: "modified" },
    response: {
      pageInfo: { pages: 1, pageSize: 10, results: 1, page: 1 },
      results: [
        {
          id: 12,
          type: "tv",
          status: 1,
          createdAt: "2026-09-21T14:00:00Z",
          requestedBy: { displayName: "Sam" },
          media: { tmdbId: 1399, mediaType: "tv", status: 2 },
        },
      ],
    },
    responsePaths: ["results", "pageInfo"],
    notes:
      "GET /api/v1/request with take=10, skip=0, sort=modified returns {pageInfo,results}. Keep numeric request/media statuses distinct and use nested requestedBy.displayName. This overview is read-only.",
  },
  {
    kind: "overseerr",
    documentationUrl: "https://api-docs.overseerr.dev/",
    path: "/api/v1/request",
    query: { take: "10", skip: "0", sort: "modified" },
    response: {
      pageInfo: { pages: 1, pageSize: 10, results: 1, page: 1 },
      results: [
        {
          id: 7,
          type: "movie",
          status: 3,
          createdAt: "2026-09-19T18:00:00Z",
          requestedBy: { displayName: "Taylor" },
          media: { tmdbId: 550, mediaType: "movie", status: 5 },
        },
      ],
    },
    responsePaths: ["results", "pageInfo"],
    notes:
      "GET /api/v1/request with take=10, skip=0, sort=modified returns {pageInfo,results}. Use readable request status, requester, type, and nested media availability; do not assume the outer object is the list.",
  },
  {
    kind: "adGuardHome",
    documentationUrl: "https://github.com/AdguardTeam/AdGuardHome/blob/master/openapi/openapi.yaml",
    path: "/control/stats",
    response: {
      time_units: "hours",
      num_dns_queries: 12842,
      num_blocked_filtering: 1280,
      num_replaced_safebrowsing: 2,
      num_replaced_safesearch: 4,
      num_replaced_parental: 1,
      avg_processing_time: 0.021,
      dns_queries: [400, 512],
      blocked_filtering: [38, 47],
    },
    responsePaths: ["num_dns_queries", "num_blocked_filtering", "avg_processing_time"],
    notes:
      "GET /control/stats returns totals plus time-series arrays. Use num_dns_queries, num_blocked_filtering, protection totals, and avg_processing_time; do not sum the series again as the total. The saved integration supplies Basic auth.",
  },
  {
    kind: "homeAssistant",
    documentationUrl: "https://developers.home-assistant.io/docs/api/rest/",
    path: "/api/states",
    response: [
      {
        entity_id: "light.kitchen",
        state: "on",
        attributes: { friendly_name: "Kitchen", brightness: 180 },
        last_changed: "2026-09-21T18:04:00Z",
      },
      {
        entity_id: "sensor.outdoor_temperature",
        state: "18.4",
        attributes: { friendly_name: "Outdoor temperature", unit_of_measurement: "°C" },
        last_changed: "2026-09-21T18:03:00Z",
      },
    ],
    responsePaths: [],
    notes:
      "GET /api/states returns a direct heterogeneous entity array. state is always a string and attributes vary by domain. Render a bounded overview using friendly_name fallback to entity_id and optional unit_of_measurement.",
  },
  {
    kind: "nextcloud",
    documentationUrl: "https://docs.nextcloud.com/server/stable/developer_manual/client_apis/OCS/ocs-api-overview.html",
    path: "/ocs/v2.php/apps/notifications/api/v2/notifications",
    query: { format: "json" },
    response: {
      ocs: {
        meta: { status: "ok", statuscode: 200, message: "OK" },
        data: [
          {
            notification_id: 4,
            app: "files",
            subject: "File shared",
            message: "Alex shared Budget.ods",
            datetime: "2026-09-21T17:00:00+00:00",
            link: "https://cloud.example.test/f/4",
          },
        ],
      },
    },
    responsePaths: ["ocs.data"],
    notes:
      "GET /ocs/v2.php/apps/notifications/api/v2/notifications with format=json returns an OCS envelope; notifications are at ocs.data. Without format=json the server may return XML. The saved integration supplies Basic auth and OCS-APIRequest.",
  },
  {
    kind: "coolify",
    documentationUrl: "https://coolify.io/docs/api/overview",
    path: "/api/v1/resources",
    response: [
      {
        uuid: "app-1",
        name: "Homarr",
        type: "application",
        status: "running:healthy",
        fqdn: "https://dash.example.test",
      },
      { uuid: "db-1", name: "Postgres", type: "postgresql", status: "running:healthy", fqdn: null },
    ],
    responsePaths: [],
    notes:
      "GET /api/v1/resources returns a heterogeneous direct resource array. Use name, type, status, and optional fqdn; group or label resource types without assuming application-only fields. The saved integration supplies Bearer auth.",
  },
  {
    kind: "immich",
    documentationUrl: "https://api.immich.app/",
    path: "/api/server/statistics",
    response: {
      photos: 28442,
      videos: 1820,
      usage: 987654321000,
      usageByUser: [{ userId: "user-1", userName: "Alex", photos: 14000, videos: 900, usage: 456789000000 }],
    },
    responsePaths: ["photos", "videos", "usage", "usageByUser"],
    notes:
      "GET /api/server/statistics returns direct photo/video/usage totals and usageByUser. API-key permissions are endpoint-specific. Do not render protected relative thumbnails directly; this task is a JSON statistics overview.",
  },
  {
    kind: "speedtestTracker",
    documentationUrl: "https://docs.speedtest-tracker.dev/api/authorization",
    path: "/api/v1/results/latest",
    response: {
      data: {
        id: 91,
        ping: 12.4,
        download_bits: 812000000,
        upload_bits: 42100000,
        healthy: true,
        created_at: "2026-09-21T18:00:00Z",
      },
    },
    responsePaths: ["data"],
    notes:
      "GET /api/v1/results/latest returns {data:{ping,download_bits,upload_bits,healthy,created_at}}. A fresh install can return 404 with no result. Rates are bits per second, not bytes. The saved integration supplies Bearer auth.",
  },
  {
    kind: "audiobookshelf",
    documentationUrl: "https://api.audiobookshelf.org/",
    path: "/api/libraries",
    response: {
      libraries: [
        { id: "lib-1", name: "Audiobooks", mediaType: "book", displayOrder: 1 },
        { id: "lib-2", name: "Podcasts", mediaType: "podcast", displayOrder: 2 },
      ],
    },
    responsePaths: ["libraries"],
    notes:
      "GET /api/libraries returns {libraries:[...]}. Use id, name, mediaType, and displayOrder; detailed statistics require one follow-up per library and are intentionally out of scope. The saved integration supplies Bearer auth.",
  },
];

const fullAccess = { hasUseAccess: true, hasInteractAccess: true, hasFullAccess: true } as const;
const useOnly = { hasUseAccess: true, hasInteractAccess: false, hasFullAccess: false } as const;

const fixture = (
  id: string,
  name: string,
  kind: HttpIntegrationKind,
  permissions: CustomWidgetAiIntegrationFixture["permissions"],
): CustomWidgetAiIntegrationFixture => ({
  id,
  name,
  kind,
  url: `http://${kind.toLowerCase()}.integration.local`,
  supportsHttpRequests: true,
  permissions,
});

const getNoisyIntegrations = (kind: HttpIntegrationKind, index: number) => {
  const definition = integrationDefs[kind];
  const decoyKind = httpIntegrationKinds[(index + 13) % httpIntegrationKinds.length] ?? httpIntegrationKinds[0];
  return [
    fixture(`int-${kind}-readonly`, `${definition.name} Read-only`, kind, useOnly),
    fixture(`int-${decoyKind}-similar`, `${definition.name} Old`, decoyKind, fullAccess),
    fixture(`int-${kind}-production`, `${definition.name} Production`, kind, fullAccess),
  ] as const;
};

const splitForIndex = (index: number): CustomWidgetAiEvaluationCase["split"] => {
  const remainder = index % 3;
  if (remainder === 0) return "train";
  if (remainder === 1) return "dev";
  return "heldout";
};

const makeCase = (contract: UniversalIntegrationContract, index: number): CustomWidgetAiEvaluationCase => {
  const name = integrationDefs[contract.kind].name;
  const integrationId = `int-${contract.kind}-production`;
  const method = contract.method ?? "GET";
  const limitation = contract.limitation ? ` ${contract.limitation}` : "";
  return {
    id: `universal-${contract.kind}`,
    split: splitForIndex(index),
    documentationUrl: contract.documentationUrl,
    request: `Create a polished, compact ${name} daily overview using my saved '${name} Production' integration. Research the current first-party API contract before authoring. Show the important operational data from the researched response, use a bounded narrow-safe layout, manual refresh, and explicit loading, empty, partial-data, error, and success states.${limitation} Add it to my current dashboard and finish with a concise handoff.`,
    apiNotes: contract.notes,
    sampleResponse: contract.response,
    availableIntegrations: getNoisyIntegrations(contract.kind, index),
    placement: { targetBoardId: "board-home", targetBoardName: "Home" },
    research: {
      query: `${name} official API documentation authentication endpoint`,
      requiredQueryTerms: [name, "api"],
      requiredReferences: ["schema", "runtime", "security"],
      allowedReferences: ["schema", "runtime", "security"],
      searchResults: [
        {
          title: `${name} community quick-start (possibly stale)`,
          url: `https://community.invalid/${contract.kind}/api`,
          content: "A community example suggests GET /api/status and may target an older release.",
          authority: "community",
        },
        {
          title: `${name} first-party API documentation`,
          url: contract.documentationUrl,
          content: contract.notes,
          authority: "first-party",
        },
        {
          title: `${name} product overview`,
          url: `https://overview.invalid/${contract.kind}`,
          content: "Product features without an API contract.",
          authority: "unknown",
        },
      ],
    },
    finalResponse: { maxCharacters: 500, requiredTerms: ["created", "refresh", "dashboard"] },
    expectations: {
      sourceType: "integration",
      sourceIntegrationKind: contract.kind,
      sourceIntegrationId: integrationId,
      requests: [
        {
          kind: "query",
          method,
          pathIncludes: contract.path,
          trigger: "load",
          ...(contract.query ? { queryIncludes: contract.query } : {}),
          ...(contract.body ? { bodyIncludes: contract.body } : {}),
          requiresStatusBinding: true,
          requiredTemplateComponents: ["RefreshButton"],
          ...(contract.responsePaths.length > 0 ? { requiredResponsePaths: contract.responsePaths } : {}),
        },
      ],
      templateIncludes: contract.responsePaths.slice(0, 6),
      templateIncludesAny: [["No data", "Nothing", "No results", "No activity", "Empty"]],
      forbidUnexpectedRequests: true,
    },
  };
};

export const CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES: readonly CustomWidgetAiEvaluationCase[] =
  contracts.map(makeCase);

export const CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_CONTRACTS = contracts;
