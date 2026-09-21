import type { HttpIntegrationKind } from "@homarr/definitions";

import type { CustomWidgetAiEvaluationCase, CustomWidgetAiIntegrationFixture } from "./ai-evaluation-cases";

const fullAccess = {
  hasUseAccess: true,
  hasInteractAccess: true,
  hasFullAccess: true,
} as const;

const fixture = (
  id: string,
  name: string,
  kind: HttpIntegrationKind,
  url: string,
  permissions: CustomWidgetAiIntegrationFixture["permissions"] = fullAccess,
): CustomWidgetAiIntegrationFixture => ({
  id,
  name,
  kind,
  url,
  supportsHttpRequests: true,
  permissions,
});

const integrationSource = (sourceIntegrationKind: HttpIntegrationKind, sourceIntegrationId: string) => ({
  sourceType: "integration" as const,
  sourceIntegrationKind,
  sourceIntegrationId,
});

const conciseHandoff = {
  maxCharacters: 600,
  requiredTerms: ["created", "refresh", "dashboard"],
} as const;

const karakeep = fixture("int-karakeep-main", "Karakeep", "karakeep", "http://karakeep.local:3000");
const mealie = fixture("int-mealie-main", "Family Mealie", "mealie", "http://mealie.local:9000");
const romm = fixture("int-romm-main", "RomM", "romm", "http://romm.local:8080");
const tubeArchivist = fixture(
  "int-tubearchivist-main",
  "TubeArchivist",
  "tubearchivist",
  "http://tubearchivist.local:8000",
);
const frigate = fixture("int-frigate-main", "Frigate", "frigate", "http://frigate.local:5000");

const CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES_BASE: readonly CustomWidgetAiEvaluationCase[] = [
  {
    id: "dispatcharr-channel-lineup",
    split: "train",
    documentationUrl: "https://dispatcharr.github.io/Dispatcharr-Docs/api/",
    request:
      "Create a Dispatcharr Channel Lineup widget for http://dispatcharr.local using a personal API key. Research the current API instead of guessing. Show a bounded, responsive channel list ordered by channel number with effective name/number fallbacks, group and EPG context, catch-up and hidden state, total count, refresh, and complete loading, empty, error, and success states. Keep the final handoff concise.",
    apiNotes:
      "Primary docs point to the instance Swagger contract at GET /api/swagger.json. Use GET /api/channels/channels/ with page=1, page_size=12, ordering=channel_number. Supplying page or page_size changes the response from a bare array to {count,next,previous,results,has_unassigned_epg_channels}; render results. Authenticate with X-API-Key. Do not invent CPU/RAM endpoints.",
    previewResponses: [
      {
        pathIncludes: "/api/channels/channels/",
        response: {
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              id: 41,
              channel_number: 101,
              name: "BBC One",
              channel_group_id: 3,
              tvg_id: "bbc-one",
              epg_data_id: 62,
              streams: [901],
              uuid: "3a4c76d1-93bb-48ad-883b-943441024769",
              is_adult: false,
              is_catchup: true,
              catchup_days: 7,
              hidden_from_output: false,
              effective_name: "BBC One HD",
              effective_channel_number: 101,
              effective_channel_group_id: 3,
              effective_epg_data_id: 62,
            },
          ],
          has_unassigned_epg_channels: false,
        },
      },
    ],
    research: {
      query: "Dispatcharr official API Swagger channels pagination authentication",
      requiredReferences: ["schema", "runtime", "security"],
      allowedReferences: ["schema", "runtime", "security"],
    },
    finalResponse: conciseHandoff,
    expectations: {
      sourceBaseUrl: "http://dispatcharr.local",
      sourceNetworkScope: "private",
      sourceAuth: "apiKeyHeader",
      sourceAuthName: "X-API-Key",
      minimumTemplateCharacters: 900,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/channels/channels/",
          trigger: "load",
          queryIncludes: { page: "1", page_size: "12", ordering: "channel_number" },
          requiresStatusBinding: true,
          requiredTemplateComponents: ["RefreshButton"],
          requiredResponsePaths: ["results"],
        },
      ],
      templateIncludes: [
        ".results",
        "count",
        "effective_name",
        "effective_channel_number",
        "channel_group_id",
        "epg_data_id",
        "is_catchup",
        "hidden_from_output",
      ],
      templateIncludesAny: [["No channels", "No channel", "Nothing here"]],
      forbidUnexpectedRequests: true,
    },
  },
  {
    id: "karakeep-recent-bookmarks",
    split: "train",
    documentationUrl: "https://docs.karakeep.app/api/karakeep-api/",
    request:
      "Create a polished Recent Bookmarks widget using my saved Karakeep integration. Show at most eight unarchived newest bookmarks and handle link, text, asset, and unknown content without broken titles or URLs. Include favorite, tags, summary/note fallbacks, cursor context, refresh, and independent loading, empty, failure, and success states. Do not expose credentials or pretend cursor pagination is page-based.",
    apiNotes:
      "GET /api/v1/bookmarks with archived=false, sortOrder=desc, limit=8, includeContent=false returns {bookmarks,nextCursor}. content is a discriminated union: link has url/title, text has text/sourceUrl, asset has assetType/assetId, and unknown has no useful payload. Titles, summaries, notes, images, tags, modifiedAt, and nextCursor may be null or empty.",
    availableIntegrations: [karakeep],
    previewResponses: [
      {
        pathIncludes: "/api/v1/bookmarks",
        response: {
          bookmarks: [
            {
              id: "link-1",
              createdAt: "2026-09-20T09:31:00Z",
              title: "A useful article",
              archived: false,
              favourited: true,
              summary: "A short generated summary.",
              note: null,
              tags: [{ id: "tag-1", name: "reading", attachedBy: "human" }],
              content: { type: "link", url: "https://example.com/article", title: "A useful article" },
            },
            {
              id: "text-1",
              createdAt: "2026-09-19T08:00:00Z",
              title: null,
              favourited: false,
              summary: null,
              note: "Remember this",
              tags: [],
              content: { type: "text", text: "Short saved thought", sourceUrl: null },
            },
            {
              id: "asset-1",
              createdAt: "2026-09-18T08:00:00Z",
              title: null,
              favourited: false,
              summary: null,
              note: null,
              tags: [],
              content: { type: "asset", assetType: "pdf", assetId: "pdf-1" },
            },
            {
              id: "unknown-1",
              createdAt: "2026-09-17T08:00:00Z",
              title: null,
              favourited: false,
              summary: null,
              note: null,
              tags: [],
              content: { type: "unknown" },
            },
          ],
          nextCursor: null,
        },
      },
    ],
    finalResponse: conciseHandoff,
    expectations: {
      ...integrationSource("karakeep", karakeep.id),
      minimumTemplateCharacters: 1_000,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/v1/bookmarks",
          trigger: "load",
          queryIncludes: { archived: "false", sortOrder: "desc", limit: "8", includeContent: "false" },
          requiresStatusBinding: true,
          requiredTemplateComponents: ["RefreshButton"],
          requiredResponsePaths: ["bookmarks"],
        },
      ],
      templateIncludes: [".bookmarks", "nextCursor", "favourited", "content.type", "link", "text", "asset", "unknown"],
      templateIncludesAny: [["Untitled", "Saved text", "Saved asset", "Unknown bookmark"]],
      forbidUnexpectedRequests: true,
    },
  },
  {
    id: "mealie-todays-meals",
    split: "train",
    documentationUrl: "https://docs.mealie.io/documentation/getting-started/api-usage/",
    request:
      "Create a Today's Meals widget using the full-access saved Mealie integration, not the similarly named inaccessible one. Render the direct-array response as a compact day plan ordered by meal type. Recipe-backed and text-only entries must both remain useful; show recipe name, servings, total time, rating, or title/text fallbacks. Include refresh and clear loading, empty, error, and success states without fabricated meals.",
    apiNotes:
      "GET /api/households/mealplans/today returns a direct array. Each entry has date, entryType, title, text, recipeId and nullable recipe. recipe may include name, slug, recipeServings, recipeYield, totalTime and rating. Text-only entries have recipeId=null and recipe=null.",
    availableIntegrations: [
      fixture("int-mealie-lab", "Mealie Lab", "mealie", "http://mealie-lab.local:9000", {
        hasUseAccess: true,
        hasInteractAccess: false,
        hasFullAccess: false,
      }),
      mealie,
    ],
    sampleResponse: [
      {
        date: "2026-09-21",
        entryType: "dinner",
        title: "",
        text: "",
        recipeId: "recipe-1",
        id: 51,
        recipe: {
          name: "Mushroom risotto",
          slug: "mushroom-risotto",
          recipeServings: 4,
          recipeYield: "servings",
          totalTime: "45 minutes",
          rating: 4.5,
        },
      },
      {
        date: "2026-09-21",
        entryType: "snack",
        title: "Use the ripe bananas",
        text: "Before tomorrow",
        recipeId: null,
        id: 52,
        recipe: null,
      },
    ],
    finalResponse: conciseHandoff,
    expectations: {
      ...integrationSource("mealie", mealie.id),
      minimumTemplateCharacters: 850,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/households/mealplans/today",
          trigger: "load",
          requiresStatusBinding: true,
          requiredTemplateComponents: ["RefreshButton"],
        },
      ],
      templateIncludes: ["entryType", "recipe", "recipeServings", "totalTime", "rating", "title", "text"],
      templateIncludesAny: [["No meals", "Nothing planned", "Plan is empty"]],
      forbidUnexpectedRequests: true,
    },
  },
  {
    id: "frigate-unreviewed-alerts",
    split: "train",
    documentationUrl: "https://docs.frigate.video/integrations/api/review-review-get/",
    request:
      "Create an Unreviewed Frigate Alerts widget using my saved integration. Show a bounded list from the last 24 hours with camera, alert severity, start/end or active duration context, objects, verified objects, zones, and reviewed state. Use a compact narrow-safe list, refresh, and complete partial-data/loading/empty/error/success handling. Do not render relative thumbnails as Homarr URLs.",
    apiNotes:
      "GET /api/review with reviewed=0, severity=alert, limit=10 returns a direct array, not an envelope. Timestamps are Unix seconds and end_time can be null. data contains arrays detections, objects, verified_objects, sub_labels, zones, audio and nullable thumb_time/metadata. thumb_path is Frigate-relative authenticated media and must not be rendered as a Homarr-relative Image.",
    availableIntegrations: [frigate],
    sampleResponse: [
      {
        id: "1789957430.014544-vgnctm",
        camera: "orlando",
        start_time: 1789957430.014544,
        end_time: null,
        severity: "alert",
        thumb_path: "/media/frigate/clips/review/thumb.webp",
        data: {
          detections: ["detection-1"],
          objects: ["person", "car"],
          verified_objects: [],
          sub_labels: [],
          zones: ["driveway"],
          audio: [],
          thumb_time: 1789957459.725515,
          metadata: null,
        },
        has_been_reviewed: false,
      },
    ],
    finalResponse: conciseHandoff,
    expectations: {
      ...integrationSource("frigate", frigate.id),
      minimumTemplateCharacters: 900,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/review",
          trigger: "load",
          queryIncludes: { reviewed: "0", severity: "alert", limit: "10" },
          requiresStatusBinding: true,
          requiredTemplateComponents: ["RefreshButton"],
        },
      ],
      templateIncludes: ["camera", "start_time", "end_time", "severity", "objects", "verified_objects", "zones"],
      templateIncludesAny: [
        ["Active", "Ongoing", "In progress"],
        ["No alerts", "All clear", "Nothing to review"],
      ],
      forbidUnexpectedRequests: true,
    },
  },
  {
    id: "dispatcharr-system-activity",
    split: "dev",
    documentationUrl: "https://dispatcharr.github.io/Dispatcharr-Docs/api/",
    request:
      "Create a Dispatcharr System Activity widget for http://dispatcharr.local. Research the deployed API. Show the public version/timestamp and the 20 most recent system events with event type, time, channel, and safe details context. Clearly state in the widget that events require an admin API key. Do not invent CPU, RAM, disk, or generic health endpoints. Keep requests independently recoverable and the result concise.",
    apiNotes:
      "GET /api/core/version/ returns {version,timestamp}. GET /api/core/system-events/ with limit=20, offset=0 returns {events,count,total,offset,limit} and requires admin. Event entries contain id,event_type,event_type_display,timestamp,channel_id,channel_name,details. Authenticate the source with X-API-Key; no CPU/RAM metrics endpoint exists in the stable API.",
    previewResponses: [
      { pathIncludes: "/api/core/version/", response: { version: "0.31.0", timestamp: "2026-09-13T17:51:03Z" } },
      {
        pathIncludes: "/api/core/system-events/",
        response: {
          events: [
            {
              id: 710,
              event_type: "channel_start",
              event_type_display: "Channel Start",
              timestamp: "2026-09-21T18:04:19+00:00",
              channel_id: "41",
              channel_name: "BBC One",
              details: {},
            },
          ],
          count: 1,
          total: 38,
          offset: 0,
          limit: 20,
        },
      },
    ],
    research: {
      query: "Dispatcharr official API version system events admin metrics Swagger",
      requiredReferences: ["schema", "runtime", "security"],
      allowedReferences: ["schema", "runtime", "security"],
    },
    finalResponse: { ...conciseHandoff, requiredTerms: ["created", "refresh", "dashboard", "admin"] },
    expectations: {
      sourceBaseUrl: "http://dispatcharr.local",
      sourceNetworkScope: "private",
      sourceAuth: "apiKeyHeader",
      sourceAuthName: "X-API-Key",
      minimumTemplateCharacters: 900,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/core/version/",
          trigger: "load",
          requiresStatusBinding: true,
        },
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/core/system-events/",
          trigger: "load",
          queryIncludes: { limit: "20", offset: "0" },
          requiresStatusBinding: true,
        },
      ],
      templateIncludes: ["version", "events", "event_type_display", "timestamp", "channel_name", "admin"],
      templateIncludesAny: [["No events", "No activity", "Nothing recent"]],
      forbidUnexpectedRequests: true,
    },
  },
  {
    id: "karakeep-library-pulse",
    split: "dev",
    documentationUrl: "https://docs.karakeep.app/api/karakeep-api/",
    request:
      "Create a Karakeep Library Pulse widget using the saved integration. Combine recent bookmarks and user statistics without letting one failed panel hide the other. Prioritize total bookmarks, favorites, this-week activity, and a bounded recent list with content-type-safe fallbacks. Show top domains or tag usage quietly, refresh each source, and handle independent loading, empty, error, and success states.",
    apiNotes:
      "GET /api/v1/users/me/stats returns numBookmarks,numFavorites,numArchived,numTags,numLists,numHighlights,bookmarksByType,topDomains,totalAssetSize,assetsByType,bookmarkingActivity and tagUsage. GET /api/v1/bookmarks with archived=false,sortOrder=desc,limit=5,includeContent=false returns {bookmarks,nextCursor}. Do not use the nonexistent booksharingActivity field.",
    availableIntegrations: [karakeep],
    previewResponses: [
      {
        pathIncludes: "/api/v1/users/me/stats",
        response: {
          numBookmarks: 842,
          numFavorites: 63,
          numArchived: 490,
          numTags: 77,
          numLists: 12,
          numHighlights: 94,
          bookmarksByType: { link: 790, text: 31, asset: 21 },
          topDomains: [{ domain: "github.com", count: 102 }],
          bookmarkingActivity: { thisWeek: 14, thisMonth: 67, thisYear: 601 },
          tagUsage: [{ name: "reading", count: 83 }],
        },
      },
      {
        pathIncludes: "/api/v1/bookmarks",
        response: {
          bookmarks: [
            {
              id: "bookmark-1",
              createdAt: "2026-09-20T09:31:00Z",
              title: "A useful article",
              favourited: true,
              summary: null,
              note: null,
              tags: [],
              content: { type: "link", url: "https://example.com", title: "A useful article" },
            },
          ],
          nextCursor: "next",
        },
      },
    ],
    finalResponse: conciseHandoff,
    expectations: {
      ...integrationSource("karakeep", karakeep.id),
      minimumTemplateCharacters: 1_100,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/v1/users/me/stats",
          trigger: "load",
          requiresStatusBinding: true,
          requiredTemplateComponents: ["RefreshButton"],
        },
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/v1/bookmarks",
          trigger: "load",
          queryIncludes: { archived: "false", sortOrder: "desc", limit: "5", includeContent: "false" },
          requiresStatusBinding: true,
          requiredTemplateComponents: ["RefreshButton"],
          requiredResponsePaths: ["bookmarks"],
        },
      ],
      templateIncludes: [
        "numBookmarks",
        "numFavorites",
        "bookmarkingActivity",
        "thisWeek",
        "topDomains",
        "tagUsage",
        ".bookmarks",
      ],
      forbidUnexpectedRequests: true,
    },
  },
  {
    id: "romm-library-overview",
    split: "dev",
    documentationUrl: "https://docs.romm.app/latest/developers/api-authentication/",
    request:
      "Create a RomM Library Overview widget using my saved integration. Combine platform/ROM/save/state/screenshot/storage totals with six recently added games. Correctly handle the paginated items envelope, nullable total, missing names, missing filesystem entries, optional cover metadata, and useful dates/sizes. Avoid browser-auth-dependent cover images; use a responsive text-first layout with independent refresh and failure states.",
    apiNotes:
      "Use GET /api/stats and GET /api/roms with limit=6,offset=0,order_by=created_at,order_dir=desc,with_char_index=false,with_filter_values=false,with_rom_id_index=false,with_total=true. Stats is a direct object with PLATFORMS,ROMS,SAVES,STATES,SCREENSHOTS,TOTAL_FILESIZE_BYTES. ROM response is {items,total,limit,offset,char_index,rom_id_index,filter_values}; item fields include id,name,fs_name_no_ext,platform_display_name,created_at,fs_size_bytes,missing_from_fs. Do not render protected relative covers.",
    availableIntegrations: [romm],
    previewResponses: [
      {
        pathIncludes: "/api/stats",
        response: {
          PLATFORMS: 14,
          ROMS: 824,
          SAVES: 39,
          STATES: 17,
          SCREENSHOTS: 61,
          TOTAL_FILESIZE_BYTES: 536870912000,
        },
      },
      {
        pathIncludes: "/api/roms",
        response: {
          items: [
            {
              id: 42,
              name: "Metroid Prime",
              fs_name_no_ext: "Metroid Prime",
              platform_display_name: "Nintendo GameCube",
              created_at: "2026-09-20T18:42:10Z",
              path_cover_small: "/assets/romm/resources/roms/42/cover/small.webp",
              url_cover: null,
              fs_size_bytes: 1459617792,
              missing_from_fs: false,
            },
          ],
          total: 824,
          limit: 6,
          offset: 0,
          char_index: {},
          rom_id_index: [],
          filter_values: {},
        },
      },
    ],
    finalResponse: conciseHandoff,
    expectations: {
      ...integrationSource("romm", romm.id),
      minimumTemplateCharacters: 1_100,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/stats",
          trigger: "load",
          requiresStatusBinding: true,
          requiredTemplateComponents: ["RefreshButton"],
        },
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/roms",
          trigger: "load",
          queryIncludes: {
            limit: "6",
            offset: "0",
            order_by: "created_at",
            order_dir: "desc",
            with_char_index: "false",
            with_filter_values: "false",
            with_rom_id_index: "false",
            with_total: "true",
          },
          requiresStatusBinding: true,
          requiredTemplateComponents: ["RefreshButton"],
          requiredResponsePaths: ["items"],
        },
      ],
      templateIncludes: [
        "PLATFORMS",
        "ROMS",
        "SAVES",
        "STATES",
        "SCREENSHOTS",
        "TOTAL_FILESIZE_BYTES",
        ".items",
        "fs_name_no_ext",
        "missing_from_fs",
      ],
      forbidUnexpectedRequests: true,
    },
  },
  {
    id: "frigate-review-and-health",
    split: "dev",
    documentationUrl: "https://docs.frigate.video/integrations/api/stats-stats-get/",
    request:
      "Create a Frigate Review & Health widget using my saved integration. Combine the current 24-hour review summary and system stats. The summary has dynamic date keys directly beside last24Hours—never a root envelope. Prioritize unreviewed alert/detection counts, service version/uptime, aggregate camera FPS, degraded camera connections, reconnects/stalls, detector inference speed, and storage. Keep partial failures independent and the layout useful at narrow widths.",
    apiNotes:
      'GET /api/review/summary with timezone=utc returns {last24Hours,"YYYY-MM-DD":...} directly; generated docs claiming root are stale. last24Hours contains reviewed_alert,reviewed_detection,total_alert,total_detection. GET /api/stats returns a direct object with cameras,detectors,service and aggregate camera_fps,process_fps,skipped_fps,detection_fps. cameras values include connection_quality,expected_fps,reconnects_last_hour,stalls_last_hour. service has uptime,version,latest_version,storage. Do not require cpu_usages or drifting audio field spellings.',
    availableIntegrations: [frigate],
    previewResponses: [
      {
        pathIncludes: "/api/review/summary",
        response: {
          last24Hours: { reviewed_alert: 196, reviewed_detection: 9, total_alert: 496, total_detection: 147 },
          "2026-09-21": {
            day: "2026-09-21",
            reviewed_alert: 18,
            reviewed_detection: 0,
            total_alert: 57,
            total_detection: 36,
          },
        },
      },
      {
        pathIncludes: "/api/stats",
        response: {
          cameras: {
            driveway: {
              camera_fps: 5,
              process_fps: 4.9,
              skipped_fps: 0.1,
              detection_fps: 2.1,
              connection_quality: 78,
              expected_fps: 5,
              reconnects_last_hour: 2,
              stalls_last_hour: 1,
            },
          },
          detectors: { coral: { inference_speed: 8.4, temperature: 42 } },
          service: {
            uptime: 86400,
            version: "0.16.1",
            latest_version: "0.16.1",
            storage: { "/media/frigate/recordings": { free: 500, used: 250, total: 750, mount_type: "ext4" } },
          },
          camera_fps: 5,
          process_fps: 4.9,
          skipped_fps: 0.1,
          detection_fps: 2.1,
        },
      },
    ],
    finalResponse: conciseHandoff,
    expectations: {
      ...integrationSource("frigate", frigate.id),
      minimumTemplateCharacters: 1_200,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/review/summary",
          trigger: "load",
          queryIncludes: { timezone: "utc" },
          requiresStatusBinding: true,
          requiredTemplateComponents: ["RefreshButton"],
          requiredResponsePaths: ["last24Hours"],
        },
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/stats",
          trigger: "load",
          requiresStatusBinding: true,
          requiredTemplateComponents: ["RefreshButton"],
        },
      ],
      templateIncludes: [
        "last24Hours",
        "reviewed_alert",
        "total_alert",
        "reviewed_detection",
        "total_detection",
        "cameras",
        "connection_quality",
        "reconnects_last_hour",
        "stalls_last_hour",
        "detectors",
        "inference_speed",
        "service",
        "storage",
      ],
      forbidUnexpectedRequests: true,
    },
  },
  {
    id: "mealie-weekly-plan",
    split: "heldout",
    documentationUrl: "https://docs.mealie.io/documentation/getting-started/api-usage/",
    request:
      "Create a seven-day Mealie Plan widget using the saved integration. Use fixed supplied dates for this benchmark and show grouped dates, meal types, recipe names or text-only fallbacks, total count, and pagination context. Be exact about mixed request/response casing, bounded rows, and empty weeks. Include refresh and complete state handling without recipe detail fetches.",
    apiNotes:
      "GET /api/households/mealplans with start_date=2026-09-21,end_date=2026-09-27,page=1,perPage=20,orderBy=date,orderDirection=asc. Request uses perPage and snake_case dates. Response is {page,per_page,total,total_pages,items,next,previous}; current Mealie uses items, not data. Entries have camelCase entryType/recipeId and nullable recipe.",
    availableIntegrations: [mealie],
    sampleResponse: {
      page: 1,
      per_page: 20,
      total: 2,
      total_pages: 1,
      items: [
        {
          date: "2026-09-21",
          entryType: "dinner",
          title: "",
          text: "",
          recipeId: "recipe-1",
          id: 51,
          recipe: { name: "Mushroom risotto", slug: "mushroom-risotto" },
        },
        {
          date: "2026-09-22",
          entryType: "snack",
          title: "Use the ripe bananas",
          text: "Before tomorrow",
          recipeId: null,
          id: 52,
          recipe: null,
        },
      ],
      next: null,
      previous: null,
    },
    finalResponse: conciseHandoff,
    expectations: {
      ...integrationSource("mealie", mealie.id),
      minimumTemplateCharacters: 950,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/households/mealplans",
          trigger: "load",
          queryIncludes: {
            start_date: "2026-09-21",
            end_date: "2026-09-27",
            page: "1",
            perPage: "20",
            orderBy: "date",
            orderDirection: "asc",
          },
          requiresStatusBinding: true,
          requiredTemplateComponents: ["RefreshButton"],
          requiredResponsePaths: ["items"],
        },
      ],
      templateIncludes: [".items", "per_page", "total_pages", "entryType", "recipeId", "recipe", "title", "text"],
      templateIncludesAny: [["No meals", "Nothing planned", "Empty week"]],
      forbidUnexpectedRequests: true,
    },
  },
  {
    id: "tubearchivist-archive-overview",
    split: "heldout",
    documentationUrl: "https://docs.tubearchivist.com/api/introduction/",
    request:
      "Create a TubeArchivist Archive Overview widget using my saved integration. Combine video archive totals with a bounded newest-video list. Use the exact data/paginate envelope, nullable stats buckets, optional channel, watched state, duration, type, media size, and truthful pagination context. Do not invent a limit parameter or render authenticated thumbnails. Keep the panels independently recoverable and narrow-safe.",
    apiNotes:
      "GET /api/stats/video/ returns a direct object with doc_count,media_size,duration,duration_str and nullable type_videos,type_shorts,type_streams,active_true,active_false. GET /api/video/ with sort=downloaded,order=desc returns {data,paginate}; do not add limit because page size is server-configured. data entries include youtube_id,title,date_downloaded,optional channel.channel_name,player.duration_str/player.watched,media_size,vid_type. Static thumbnails require auth by default and must not be rendered.",
    availableIntegrations: [tubeArchivist],
    previewResponses: [
      {
        pathIncludes: "/api/stats/video/",
        response: {
          doc_count: 4282,
          media_size: 536870912000,
          duration: 9800000,
          duration_str: "113 days 10 hours",
          type_videos: { doc_count: 4000, media_size: 500000000000, duration_str: "105 days 7 hours" },
          type_shorts: null,
          type_streams: { doc_count: 282, media_size: 36870912000, duration_str: "8 days 2 hours" },
          active_true: null,
          active_false: null,
        },
      },
      {
        pathIncludes: "/api/video/",
        response: {
          data: [
            {
              youtube_id: "2tdiKTSdE9Y",
              title: "Building a quiet home server",
              published: "20260918",
              date_downloaded: 1789764300,
              media_size: 734003200,
              vid_type: "videos",
              vid_thumb_url: "/cache/videos/2/2tdiKTSdE9Y.jpg",
              channel: { channel_name: "Tech Archive" },
              player: { watched: false, duration: 1248, duration_str: "20:48" },
            },
          ],
          paginate: {
            page_size: 12,
            page_from: 0,
            current_page: 0,
            last_page: 356,
            total_hits: 4282,
            next_pages: [2, 3, 4],
          },
        },
      },
    ],
    finalResponse: conciseHandoff,
    expectations: {
      ...integrationSource("tubearchivist", tubeArchivist.id),
      minimumTemplateCharacters: 1_100,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/stats/video/",
          trigger: "load",
          requiresStatusBinding: true,
          requiredTemplateComponents: ["RefreshButton"],
        },
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/video/",
          trigger: "load",
          queryIncludes: { sort: "downloaded", order: "desc" },
          requiresStatusBinding: true,
          requiredTemplateComponents: ["RefreshButton"],
          requiredResponsePaths: ["data", "paginate"],
        },
      ],
      templateIncludes: [
        "doc_count",
        "duration_str",
        "type_videos",
        "type_shorts",
        "type_streams",
        ".data",
        ".paginate",
        "channel_name",
        "watched",
        "total_hits",
      ],
      forbidUnexpectedRequests: true,
    },
  },
  {
    id: "frigate-live-safety-fallback",
    split: "heldout",
    documentationUrl: "https://docs.frigate.video/configuration/live/",
    request:
      "I asked for a Frigate live camera widget. Build the safest useful Custom Widget possible with my saved authenticated integration, but do not fake support. Explain inside the widget that authenticated live media cannot be passed through the JSON request runtime, never place a token in a URL, and provide a camera-health fallback from system stats with FPS, connection quality, reconnects, and stalls. Keep the final handoff direct about the limitation.",
    apiNotes:
      "Frigate live MJPEG, latest images, clips, and go2rtc streams are binary/media endpoints. Custom Widget requests parse JSON/text, Image cannot attach the integration bearer header, iframes/browser fetch/WebSockets are unavailable, and thumb_path is Frigate-relative. Never put JWT/API credentials in a media URL. Use GET /api/stats as the only request for a useful camera-health fallback; its direct object includes cameras and aggregate FPS fields.",
    availableIntegrations: [frigate],
    sampleResponse: {
      cameras: {
        front_door: {
          camera_fps: 5,
          process_fps: 5,
          skipped_fps: 0,
          detection_fps: 1.4,
          connection_quality: 100,
          expected_fps: 5,
          reconnects_last_hour: 0,
          stalls_last_hour: 0,
        },
      },
      camera_fps: 5,
      process_fps: 5,
      skipped_fps: 0,
      detection_fps: 1.4,
      service: { uptime: 86400, version: "0.16.1" },
    },
    finalResponse: { ...conciseHandoff, requiredTerms: ["created", "refresh", "dashboard", "live"] },
    expectations: {
      ...integrationSource("frigate", frigate.id),
      minimumTemplateCharacters: 900,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/stats",
          trigger: "load",
          requiresStatusBinding: true,
          requiredTemplateComponents: ["RefreshButton"],
        },
      ],
      templateIncludes: [
        "cameras",
        "camera_fps",
        "connection_quality",
        "reconnects_last_hour",
        "stalls_last_hour",
        "live",
      ],
      templateIncludesAny: [
        ["not supported", "cannot", "unavailable"],
        ["authenticated", "credentials", "token"],
      ],
      forbidUnexpectedRequests: true,
    },
  },
  {
    id: "dispatcharr-now-playing-permission",
    split: "heldout",
    documentationUrl: "https://dispatcharr.github.io/Dispatcharr-Docs/api/",
    request:
      "Create a Dispatcharr Now Playing lookup for http://dispatcharr.local after researching its current API. Load a bounded channel lineup, let the user choose a channel, and manually fetch its current program. The current-program endpoint is read-only behavior implemented as POST and requires an admin API key; model that honestly as a confirmed manual action with full permission and state the privilege in the UI and handoff. Never send more than 50 UUIDs.",
    apiNotes:
      "GET /api/channels/channels/ with page=1,page_size=12,ordering=channel_number returns {count,results}. POST /api/epg/current-programs/ with JSON {channel_uuids:[uuid]} returns a direct array of programs. It is read-only but the server maps POST to admin; in Custom Widgets non-GET integration requests are manual actions, require full permission, and should be confirmed. Program fields include start_time,end_time,title,sub_title,description,is_new,is_live,is_premiere,is_finale,channel_uuid.",
    previewResponses: [
      {
        pathIncludes: "/api/channels/channels/",
        kind: "query",
        method: "GET",
        response: {
          count: 1,
          results: [
            {
              id: 41,
              uuid: "3a4c76d1-93bb-48ad-883b-943441024769",
              effective_name: "BBC One",
              effective_channel_number: 101,
            },
          ],
        },
      },
      {
        pathIncludes: "/api/epg/current-programs/",
        kind: "action",
        method: "POST",
        response: [
          {
            id: 8182,
            start_time: "2026-09-21T18:00:00Z",
            end_time: "2026-09-21T19:00:00Z",
            title: "Evening News",
            sub_title: null,
            description: "The day's headlines.",
            is_new: true,
            is_live: true,
            channel_uuid: "3a4c76d1-93bb-48ad-883b-943441024769",
          },
        ],
      },
    ],
    research: {
      query: "Dispatcharr official API channels current programs POST admin permission",
      requiredReferences: ["schema", "runtime", "security"],
      allowedReferences: ["schema", "runtime", "security"],
    },
    finalResponse: { ...conciseHandoff, requiredTerms: ["created", "refresh", "dashboard", "admin"] },
    expectations: {
      sourceBaseUrl: "http://dispatcharr.local",
      sourceNetworkScope: "private",
      sourceAuth: "apiKeyHeader",
      sourceAuthName: "X-API-Key",
      minimumTemplateCharacters: 1_050,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/channels/channels/",
          trigger: "load",
          queryIncludes: { page: "1", page_size: "12", ordering: "channel_number" },
          requiredResponsePaths: ["results"],
        },
        {
          kind: "action",
          method: "POST",
          pathIncludes: "/api/epg/current-programs/",
          trigger: "manual",
          permission: "full",
          bodyIncludes: { channel_uuids: "$param:*" },
          requiresConfirmation: true,
          requiredTemplateComponents: ["ActionButton"],
        },
      ],
      templateIncludes: [
        ".results",
        "effective_name",
        "effective_channel_number",
        "channel_uuids",
        "start_time",
        "end_time",
        "title",
        "is_live",
        "admin",
      ],
      forbidUnexpectedRequests: true,
    },
  },
] as const;

export const CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES: readonly CustomWidgetAiEvaluationCase[] =
  CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES_BASE.map((testCase) => ({
    ...testCase,
    placement: { targetBoardId: "board-home", targetBoardName: "Home" },
  }));
