export interface CustomWidgetAiExpectation {
  sourceType?: "http" | "integration";
  sourceBaseUrl?: string;
  sourceIntegrationKind?: string;
  sourceNetworkScope?: "public" | "private" | "loopback";
  sourceAuth?: "none" | "bearer" | "basic" | "apiKeyHeader" | "apiKeyQuery";
  sourceAuthName?: string;
  minimumTemplateCharacters?: number;
  requests: Array<{
    kind: "query" | "action";
    method: "GET" | "POST";
    pathIncludes: string;
    trigger?: "load" | "manual";
    permission?: "view" | "modify" | "full";
    queryIncludes?: Record<string, string | readonly string[]>;
    bodyIncludes?: Record<string, string | readonly string[]>;
    invalidates?: string[];
    invalidatesPaths?: string[];
    requiresConfirmation?: boolean;
    requiresStatusBinding?: boolean;
  }>;
  templateIncludes?: string[];
  templateIncludesAny?: string[][];
}

export interface CustomWidgetAiEvaluationCase {
  id: string;
  request: string;
  documentationUrl: string;
  apiNotes: string;
  preferredExampleId?: string;
  sampleResponse?: unknown;
  previewResponses?: Array<{
    pathIncludes: string;
    kind?: "query" | "action";
    method?: "GET" | "POST";
    response: unknown;
  }>;
  minimumPreviewCycles?: number;
  expectations?: CustomWidgetAiExpectation;
  expectedWidgets?: Array<{
    id: string;
    request: string;
    apiNotes?: string;
    expectations: CustomWidgetAiExpectation;
  }>;
  research?: {
    query: string;
    requiredReferences: Array<"schema" | "runtime" | "security">;
    allowedReferences?: Array<"schema" | "runtime" | "security">;
  };
}

const seerrSourceApiNotes =
  "Use the suggested self-hosted source http://seerr.local:5055/api/v1 with private network scope and X-Api-Key header authentication.";
const seerrRequestOperationsApiNotes =
  "GET /request/count returns total, movie, tv, pending, approved, declined, processing, available, and completed counts. GET /request accepts take, skip, filter, sort, sortDirection, requestedBy, and mediaType; use fixed primitives take=10, skip=0, sort=added, and sortDirection=desc. Its response has pageInfo.pages/pageSize/results/page and a results array whose entries include id, type, numeric status, createdAt, profileName, requestedBy.displayName, and media.tmdbId/mediaType/status/status4k. Request status values are 1 Pending, 2 Approved, 3 Declined, 4 Failed, and 5 Completed. For managers, POST /request/{param:requestId}/approve and POST /request/{param:requestId}/decline change a pending request's status without a body; show them only for status 1, confirm both, and invalidate the count and list queries. This scoped widget intentionally uses text pageInfo context and does not require media-title joins, search requests, or interactive pagination.";
const seerrMediaResearchApiNotes =
  "GET /search requires query and accepts optional page. Its entire response is an envelope with page, totalPages, totalResults, and results; mixed result entries include id, mediaType, title or name, overview, posterPath, backdropPath, voteAverage, releaseDate or firstAirDate, and mediaInfo.status/status4k, so render the array at response.results rather than mapping the envelope. TMDB artwork paths are relative: build a full https://image.tmdb.org/t/p/w780 URL from backdropPath with posterPath fallback. POST /request requires mediaType and mediaId; TV requests can use seasons='all'. Both request actions need modify permission, confirmation, and must invalidate the search query after success. This scoped widget intentionally does not require request counts, a request queue, status filters, or sorting.";
const seerrMediaStatusApiNotes =
  "Both media.status and mediaInfo.status/status4k use 1 Unknown, 2 Pending, 3 Processing, 4 Partially Available, 5 Available, 6 Blocklisted, and 7 Deleted. Render readable labels rather than raw codes.";

export const CUSTOM_WIDGET_AI_EVALUATION_CASES: readonly CustomWidgetAiEvaluationCase[] = [
  {
    id: "pokedex",
    documentationUrl: "https://pokeapi.co/docs/v2",
    request:
      "Create a complete Pokédex widget using PokéAPI. Make at least three deliberate refinement passes through validation and preview testing. It must have a substantial polished UI with a direct name lookup, a searchable loaded list that stays visible while details open in a separate responsive result area, sprites, types, abilities, base-stat progress bars, and clear initial, loading, empty, failure, and success states. Use a restrained accent and flexible tile sizing rather than repetitive nested cards or a fixed-height list. Completeness must come from tested useful interactions, not filler JSX.",
    apiNotes:
      "Use GET /api/v2/pokemon?limit=<option>&offset=<option> for the list and GET /api/v2/pokemon/{param:name} as a manual detail query for both direct typed lookup and selected list items. Keep the list visible while rendering detail output. Prefer sprites.other.official-artwork.front_default from the tested detail response rather than parsing an ID from a list URL. PokeAPI needs no authentication.",
    previewResponses: [
      {
        pathIncludes: "/api/v2/pokemon/{param:name}",
        response: {
          id: 25,
          name: "pikachu",
          height: 4,
          weight: 60,
          sprites: { other: { "official-artwork": { front_default: "https://example.test/pikachu.png" } } },
          types: [{ slot: 1, type: { name: "electric" } }],
          abilities: [{ ability: { name: "static" }, is_hidden: false }],
          stats: [
            { base_stat: 35, stat: { name: "hp" } },
            { base_stat: 90, stat: { name: "speed" } },
          ],
        },
      },
      {
        pathIncludes: "/api/v2/pokemon",
        response: {
          count: 1_302,
          next: "https://pokeapi.co/api/v2/pokemon?offset=20&limit=20",
          previous: null,
          results: [
            { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" },
            { name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon/25/" },
          ],
        },
      },
    ],
    minimumPreviewCycles: 3,
    expectations: {
      sourceBaseUrl: "https://pokeapi.co",
      sourceAuth: "none",
      requests: [
        { kind: "query", method: "GET", pathIncludes: "/api/v2/pokemon", trigger: "load" },
        { kind: "query", method: "GET", pathIncludes: "/api/v2/pokemon/{param:name}", trigger: "manual" },
      ],
      templateIncludes: ["TextInput", "SubFetch", "Image", "types", "abilities", "stats", "Progress"],
    },
  },
  {
    id: "portainer-containers",
    documentationUrl: "https://docs.portainer.io/api/examples",
    request:
      "Create an excellent Portainer container dashboard: environment option, running/stopped summary, responsive container list, health/status badges, and explicit start, stop, and restart actions with confirmation and refresh after success.",
    apiNotes:
      "Use X-API-Key auth. List containers with GET /api/endpoints/{option:endpointId}/docker/containers/json?all=true. Actions are POST /api/endpoints/{option:endpointId}/docker/containers/{param:id}/start, /stop, and /restart and invalidate the list query.",
  },
  {
    id: "tautulli-activity",
    documentationUrl: "https://github.com/Tautulli/Tautulli/wiki/Tautulli-API-Reference",
    request:
      "Create a beautiful Tautulli activity widget with active stream cards, user/player details, progress, transcode/direct-play badges, bandwidth summary, and a refresh control that works in narrow and wide tiles.",
    apiNotes:
      "Use an apiKeyQuery source with parameter name apikey. Query GET /api/v2 with query cmd=get_activity. The response payload is under response.data and sessions is an array.",
  },
  {
    id: "bambubuddy-printer",
    documentationUrl: "https://wiki.bambuddy.cool/reference/api/",
    request:
      "Create a premium BambuBuddy printer status widget with printer selector, current job, progress, remaining time, nozzle and bed temperatures, connection state, and safe pause/resume/stop controls when supported.",
    apiNotes:
      "Use X-API-Key auth and base path /api/v1. GET /printers lists printers and GET /printers/{id}/status returns state, progress, remaining_time, temperatures.nozzle, temperatures.bed, and hms_status. The official reference does not document pause, resume, or stop endpoints, so omit those actions. Configure the selected printer with choicesFrom on a widget option and use that option in the status path.",
  },
  {
    id: "home-assistant-control",
    documentationUrl: "https://developers.home-assistant.io/docs/api/rest/",
    request:
      "Create a refined Home Assistant room widget with temperature and humidity readings, light status, a room/entity option, and an actionable light toggle. Use calm hierarchy and responsive controls, not a pile of nested cards.",
    apiNotes:
      "Use bearer auth. GET /api/states/{option:sensorEntity} and /api/states/{option:lightEntity} load entity state. POST /api/services/light/turn_on and /turn_off accept a body with entity_id from an option and should invalidate the light query.",
  },
  {
    id: "fake-service-health",
    documentationUrl: "https://status.example.test/docs",
    request:
      "Using the supplied fake API contract, create a polished service-health widget for a small homelab. Prioritize the overall state, incident count, latency, last check time, and a compact list of services. It must be immediately useful in narrow and wide dashboard tiles.",
    apiNotes:
      "This is a deterministic fake API. Use https://status.example.test with no authentication. GET /v1/health returns the exact sample response. Do not invent additional endpoints or actions.",
    sampleResponse: {
      status: "degraded",
      checkedAt: "2026-08-10T12:00:00Z",
      latencyMs: 184,
      openIncidents: 1,
      services: [
        { id: "media", name: "Media", status: "operational", latencyMs: 42 },
        { id: "photos", name: "Photos", status: "degraded", latencyMs: 331 },
        { id: "dns", name: "DNS", status: "operational", latencyMs: 8 },
      ],
    },
    expectations: {
      sourceBaseUrl: "https://status.example.test",
      sourceAuth: "none",
      requests: [{ kind: "query", method: "GET", pathIncludes: "/v1/health" }],
      templateIncludes: ["checkedAt", "latencyMs", "openIncidents", "services", "RefreshButton"],
    },
  },
  {
    id: "coinmarketcap-keyless",
    documentationUrl: "https://coinmarketcap.com/api/documentation/pro-api-reference/keyless-public-api",
    request:
      "Create a compact but premium cryptocurrency watchlist for Bitcoin, Ethereum, and Solana. Show price, 24-hour change, market cap, volume, clear positive/negative styling, refresh context, and excellent narrow-tile behavior.",
    apiNotes:
      "Use the current keyless CoinMarketCap public API. The source is https://pro-api.coinmarketcap.com with no authentication. GET /public-api/v3/cryptocurrency/quotes/latest with id=1,1027,5426 and convert=USD so similarly named symbols cannot add unrelated assets. The response object has a data array; each asset has name, symbol, is_active, cmc_rank, quote[0].price, quote[0].percent_change_24h, quote[0].market_cap, quote[0].volume_24h, and last_updated.",
    sampleResponse: {
      data: [
        {
          id: 1,
          name: "Bitcoin",
          symbol: "BTC",
          is_active: 1,
          cmc_rank: 1,
          quote: [
            {
              symbol: "USD",
              price: 118_240.42,
              percent_change_24h: 2.41,
              market_cap: 2_354_000_000_000,
              volume_24h: 48_700_000_000,
            },
          ],
          last_updated: "2026-08-10T12:00:00Z",
        },
        {
          id: 1027,
          name: "Ethereum",
          symbol: "ETH",
          is_active: 1,
          cmc_rank: 2,
          quote: [
            {
              symbol: "USD",
              price: 4_210.18,
              percent_change_24h: -1.13,
              market_cap: 508_000_000_000,
              volume_24h: 21_300_000_000,
            },
          ],
          last_updated: "2026-08-10T12:00:00Z",
        },
        {
          id: 5426,
          name: "Solana",
          symbol: "SOL",
          is_active: 1,
          cmc_rank: 6,
          quote: [
            {
              symbol: "USD",
              price: 181.72,
              percent_change_24h: 4.02,
              market_cap: 98_400_000_000,
              volume_24h: 5_900_000_000,
            },
          ],
          last_updated: "2026-08-10T12:00:00Z",
        },
      ],
      status: { timestamp: "2026-08-10T12:00:01Z", error_code: "0", error_message: "", elapsed: 6 },
    },
    expectations: {
      sourceBaseUrl: "https://pro-api.coinmarketcap.com",
      sourceAuth: "none",
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/public-api/v3/cryptocurrency/quotes/latest",
          trigger: "load",
          queryIncludes: { id: "1,1027,5426", convert: "USD" },
        },
      ],
      templateIncludes: ["?.data", "percent_change_24h", "market_cap", "volume_24h", "last_updated", "RefreshButton"],
    },
  },
  {
    id: "bored-activity",
    documentationUrl: "https://bored-api.appbrewery.com/",
    request:
      "Create a delightful activity discovery widget. It should load one random activity, make the suggestion and practical constraints easy to scan, link to the activity when available, and provide a safe manual way to fetch another suggestion. It must feel useful in both a small dashboard tile and a wide one.",
    apiNotes:
      "Use https://bored-api.appbrewery.com with no authentication. GET /random returns one object with activity, availability, type, participants, price, accessibility, duration, kidFriendly, link, and key. The service is rate limited, so use a sensible query cache and do not create duplicate load requests.",
    sampleResponse: {
      activity: "Learn Express.js",
      availability: 0.25,
      type: "education",
      participants: 1,
      price: 0.1,
      accessibility: "Few to no challenges",
      duration: "hours",
      kidFriendly: true,
      link: "https://expressjs.com/",
      key: "3943506",
    },
    expectations: {
      sourceBaseUrl: "https://bored-api.appbrewery.com",
      sourceAuth: "none",
      requests: [{ kind: "query", method: "GET", pathIncludes: "/random", trigger: "load" }],
      templateIncludes: ["activity", "participants", "price", "accessibility", "duration", "RefreshButton"],
    },
  },
  {
    id: "agify-name",
    documentationUrl: "https://agify.io/documentation/api/reference",
    request:
      "Create a polished age-estimation lookup widget powered by Agify. Let the user enter a full name, manually run the prediction, optionally scope it with a two-letter country code, and clearly explain the estimate and evidence count without presenting it as certainty. Include thoughtful initial, loading, no-result, error, and success states.",
    apiNotes:
      "Use https://api.agify.io. Authentication is an API key supplied through the source as apiKeyQuery with query parameter name apikey; never embed it. The manual GET / request receives name from {param:name} and an optional country_id from {param:country}. A successful response has name, age (integer or null), count, and optionally country_id.",
    sampleResponse: { name: "michael", age: 58, count: 108_496, country_id: "US" },
    expectations: {
      sourceBaseUrl: "https://api.agify.io",
      sourceAuth: "apiKeyQuery",
      sourceAuthName: "apikey",
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/",
          trigger: "manual",
          queryIncludes: { name: "$param:name", country_id: "$param:country" },
        },
      ],
      templateIncludes: ["TextInput", "SubFetch", "age", "count"],
    },
  },
  {
    id: "seerr-media-workflows",
    documentationUrl: "https://github.com/seerr-team/seerr/blob/develop/seerr-api.yml",
    request:
      "Research Seerr's current API once, then create two coordinated but independent Custom Widgets in this run. The first is a polished request-operations widget: prioritize total, pending, approved, and available in a responsive SimpleGrid, with Pending as the primary visual accent, Total as the strong anchor, and Approved/Available quieter; add compact processing and declined context, then show a recent queue with a two-level row hierarchy and strong identity such as Movie · TMDB 603 · Request #91. Give pending rows a restrained theme-aware accent. Keep requester and actions primary without repeating media type; use requestedBy.avatar only when present, set Avatar imageProps.alt from displayName, label profileName accurately as Media profile, and show missing data neutrally as Not provided. Separate identity from compact Created/Profile and Media/4K metadata groups plus a wrapping status/action row for narrow tiles. Show readable request/media/4K states, createdAt as clearly labeled UTC time, truthful pageInfo including total results, refresh, and safe confirmed approve and decline for pending requests. Preserve usable counts or queue when only its sibling request fails, and show subtle in-place refresh context when cached data remains. Give it resilient loading, empty, error, and success states. The second is an advanced media-research widget: use a bound search input and a manual SubFetch submit that never searches while typing and relies on native loading/error/retry, with functional pagination through bound request parameters. Reset pagination to page 1 when the query changes before the next manual run, keep a result-local control to rerun the same search, and render Pagination only when totalPages is greater than 1. Show exactly one concise active query/page/total-results summary. Keep its header to one compact line without explanatory copy. Render compact responsive results without redundant outer or per-item chrome; Image prefers backdropPath with posterPath fallback and uses a compact thumbnail beside content at base, widening only above xs without stacking a small capped image in a full-width slot. Clamp overview text, include release metadata, an explicit Rating label only when voteAverage is present, and compact readable mediaInfo plus 4K status badges, with resilient loading/no-results/error states and safe confirmed movie/full-series requests per result. Both must be excellent in narrow and wide tiles, independently validated and preview-tested, and persisted from their exact tested previews.",
    apiNotes: `${seerrSourceApiNotes} ${seerrRequestOperationsApiNotes} ${seerrMediaResearchApiNotes} ${seerrMediaStatusApiNotes}`,
    previewResponses: [
      {
        pathIncludes: "/request/count",
        kind: "query",
        method: "GET",
        response: {
          total: 42,
          movie: 25,
          tv: 17,
          pending: 4,
          approved: 9,
          declined: 2,
          processing: 6,
          available: 20,
          completed: 21,
        },
      },
      {
        pathIncludes: "/request",
        kind: "query",
        method: "GET",
        response: {
          pageInfo: { pages: 5, pageSize: 10, results: 42, page: 1 },
          results: [
            {
              id: 91,
              type: "movie",
              status: 2,
              createdAt: "2026-08-28T19:22:00.000Z",
              profileName: "HD-1080p",
              requestedBy: { id: 7, displayName: "Alex", avatar: "/avatar/alex" },
              media: { tmdbId: 603, mediaType: "movie", status: 3, status4k: 1 },
            },
            {
              id: 92,
              type: "tv",
              status: 1,
              createdAt: "2026-08-29T08:05:00.000Z",
              requestedBy: { id: 8, displayName: "Sam", avatar: "/avatar/sam" },
              media: { tmdbId: 1399, mediaType: "tv", status: 2, status4k: 1 },
            },
          ],
        },
      },
      {
        pathIncludes: "/search",
        kind: "query",
        method: "GET",
        response: {
          page: 1,
          totalPages: 1,
          totalResults: 2,
          results: [
            {
              id: 603,
              mediaType: "movie",
              title: "The Matrix",
              overview: "A hacker discovers the world is a simulated reality.",
              posterPath: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
              backdropPath: "/icmmSD4vTTDKOq2vvdulafOGw93.jpg",
              voteAverage: 8.2,
              releaseDate: "1999-03-30",
              mediaInfo: { status: 3, status4k: 1 },
            },
            {
              id: 1399,
              mediaType: "tv",
              name: "Game of Thrones",
              overview: "Noble families compete for control of the realm.",
              posterPath: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
              backdropPath: "/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg",
              voteAverage: 8.5,
              firstAirDate: "2011-04-17",
              mediaInfo: { status: 2, status4k: 1 },
            },
          ],
        },
      },
      {
        pathIncludes: "/request",
        kind: "action",
        method: "POST",
        response: { id: 93, status: 1, type: "movie", media: { tmdbId: 603, mediaType: "movie" } },
      },
      {
        pathIncludes: "/request/{param:requestId}/approve",
        kind: "action",
        method: "POST",
        response: { id: 91, status: 2, type: "movie", modifiedBy: { displayName: "Admin" } },
      },
      {
        pathIncludes: "/request/{param:requestId}/decline",
        kind: "action",
        method: "POST",
        response: { id: 91, status: 3, type: "movie", modifiedBy: { displayName: "Admin" } },
      },
    ],
    research: {
      query: "Seerr API search media create request get requests X-Api-Key",
      requiredReferences: ["schema", "runtime", "security"],
      allowedReferences: ["schema", "runtime", "security"],
    },
    expectedWidgets: [
      {
        id: "request-operations",
        request:
          "A Seerr request-operations widget with asymmetric Total/Pending priority plus quieter Approved/Available and processing/declined context, independently recoverable count/queue failures, subtle cached refresh context, divider-based rows with a pending accent, a narrow-first two-level queue, non-duplicated request/media identity, accessible requester/avatar and Media profile context, compact Created/Profile and Media/4K groups, readable request state, UTC time, truthful total-results page context, refresh, confirmed approve/decline for pending requests, and complete loading, empty, error, and success states.",
        apiNotes: `${seerrSourceApiNotes} ${seerrRequestOperationsApiNotes} ${seerrMediaStatusApiNotes}`,
        expectations: {
          sourceBaseUrl: "http://seerr.local:5055/api/v1",
          sourceNetworkScope: "private",
          sourceAuth: "apiKeyHeader",
          sourceAuthName: "X-Api-Key",
          minimumTemplateCharacters: 900,
          requests: [
            {
              kind: "query",
              method: "GET",
              pathIncludes: "/request/count",
              trigger: "load",
              requiresStatusBinding: true,
            },
            {
              kind: "query",
              method: "GET",
              pathIncludes: "/request",
              trigger: "load",
              queryIncludes: { take: "10", skip: "0", sort: "added", sortDirection: "desc" },
              requiresStatusBinding: true,
            },
            {
              kind: "action",
              method: "POST",
              pathIncludes: "/request/{param:requestId}/approve",
              trigger: "manual",
              permission: "modify",
              invalidatesPaths: ["/request/count", "/request"],
              requiresConfirmation: true,
            },
            {
              kind: "action",
              method: "POST",
              pathIncludes: "/request/{param:requestId}/decline",
              trigger: "manual",
              permission: "modify",
              invalidatesPaths: ["/request/count", "/request"],
              requiresConfirmation: true,
            },
          ],
          templateIncludes: [
            "RefreshButton",
            "ActionButton",
            "SimpleGrid",
            "pageInfo",
            "results",
            "pending",
            "approved",
            "available",
            "processing",
            "declined",
            "createdAt",
            "Date.toLocaleString",
            "tmdbId",
            "status4k",
            "status.",
            "Failed",
            "Completed",
            "Not provided",
            "imageProps",
          ],
          templateIncludesAny: [
            ["TMDB", "Tmdb"],
            ["Request #", "Request ID"],
            ["UTC", "utc"],
          ],
        },
      },
      {
        id: "media-research",
        request:
          "A compact Seerr media-research widget with manual bound search/pagination that resets to page 1 when the query changes, native SubFetch failure/retry, a result-local same-query rerun, conditional multi-page Pagination, one active query/page/total-results summary, a one-line header, a compact base thumbnail beside content that widens above xs, clamped overview, an explicit conditional Rating label, compact readable normal and 4K status badges, and confirmed direct requests for movies and full TV series.",
        apiNotes: `${seerrSourceApiNotes} ${seerrMediaResearchApiNotes} ${seerrMediaStatusApiNotes}`,
        expectations: {
          sourceBaseUrl: "http://seerr.local:5055/api/v1",
          sourceNetworkScope: "private",
          sourceAuth: "apiKeyHeader",
          sourceAuthName: "X-Api-Key",
          minimumTemplateCharacters: 900,
          requests: [
            {
              kind: "query",
              method: "GET",
              pathIncludes: "/search",
              trigger: "manual",
              queryIncludes: { query: "$param:query", page: "$param:page" },
            },
            {
              kind: "action",
              method: "POST",
              pathIncludes: "/request",
              trigger: "manual",
              permission: "modify",
              bodyIncludes: { mediaType: ["movie", "$param:*"], mediaId: "$param:*" },
              invalidatesPaths: ["/search"],
              requiresConfirmation: true,
            },
            {
              kind: "action",
              method: "POST",
              pathIncludes: "/request",
              trigger: "manual",
              permission: "modify",
              bodyIncludes: {
                mediaType: ["tv", "$param:*"],
                mediaId: "$param:*",
                seasons: ["all", "$param:*"],
              },
              invalidatesPaths: ["/search"],
              requiresConfirmation: true,
            },
          ],
          templateIncludes: [
            "TextInput",
            "SubFetch",
            'trigger="manual"',
            "RefreshButton",
            'requestId="search"',
            "ActionButton",
            "Image",
            "Pagination",
            "defaultValue={1}",
            "resetKey",
            "inputs.page ?? 1",
            ".results",
            "posterPath",
            "backdropPath",
            "https://image.tmdb.org/t/p/",
            "w780",
            "totalResults",
            "overview",
            "lineClamp",
            "voteAverage",
            "mediaInfo",
            "status4k",
            "Unknown",
            "Pending",
            "Processing",
            "Available",
            "Blocklisted",
            "Deleted",
          ],
          templateIncludesAny: [
            ["resetKey={inputs.query}", "resetKey={inputs.search}"],
            ["Rating", "★", "/10"],
            ["Partially Available", "Partially available"],
            ["No matching", "No results", "No media", "Nothing found"],
          ],
        },
      },
    ],
  },
  {
    id: "seed-dispatcharr-channels",
    documentationUrl: "https://dispatcharr.github.io/Dispatcharr-Docs/api/",
    request:
      "Create the shipped Dispatcharr Channels widget for my private Dispatcharr instance. Show a bounded channel lineup ordered by channel number with effective name and number fallbacks, group and EPG context, catch-up and hidden state, total count, refresh, and complete loading, empty, error, and success states.",
    apiNotes:
      "Keep the shipped private-network HTTP source placeholder and X-API-Key header configuration; the user supplies the real URL and secret through secure source configuration. GET /api/channels/channels/ with page=1, page_size=12, ordering=channel_number returns {count,next,previous,results,has_unassigned_epg_channels}. Render results and do not invent system metrics or actions.",
    preferredExampleId: "dispatcharr-channels",
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
              uuid: "3a4c76d1-93bb-48ad-883b-943441024769",
              channel_number: 101,
              name: "BBC One",
              channel_group_id: 3,
              epg_data_id: 62,
              effective_name: "BBC One HD",
              effective_channel_number: 101,
              effective_channel_group_id: 3,
              effective_epg_data_id: 62,
              is_catchup: true,
              catchup_days: 7,
              hidden_from_output: false,
            },
            {
              id: 42,
              uuid: "b0e4e5e0-31a4-47ed-a6b7-35680a4f540e",
              channel_number: 102,
              name: "News Backup",
              channel_group_id: null,
              epg_data_id: null,
              effective_name: null,
              effective_channel_number: null,
              effective_channel_group_id: null,
              effective_epg_data_id: null,
              is_catchup: false,
              catchup_days: 0,
              hidden_from_output: true,
            },
          ],
          has_unassigned_epg_channels: false,
        },
      },
    ],
    expectations: {
      sourceBaseUrl: "https://your-service.example.com",
      sourceNetworkScope: "private",
      sourceAuth: "apiKeyHeader",
      sourceAuthName: "X-API-Key",
      minimumTemplateCharacters: 800,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/channels/channels/",
          trigger: "load",
          queryIncludes: { page: "1", page_size: "12", ordering: "channel_number" },
          requiresStatusBinding: true,
        },
      ],
      templateIncludes: [
        "RefreshButton",
        ".results",
        "count",
        "effective_name",
        "effective_channel_number",
        "channel_group_id",
        "epg_data_id",
        "is_catchup",
        "hidden_from_output",
      ],
      templateIncludesAny: [
        ["No channels", "empty lineup"],
        ["catch-up", "Catch-up", "Catch up"],
      ],
    },
  },
  {
    id: "seed-karakeep-bookmarks",
    documentationUrl: "https://docs.karakeep.app/api/karakeep-api/",
    request:
      "Create the shipped Karakeep Recent Bookmarks widget using my saved Karakeep integration. Show at most eight newest unarchived bookmarks, handle link, text, asset, and unknown content without broken titles, and include favorite state, tags, summary or note fallbacks, cursor context, refresh, and complete loading, empty, error, and success states.",
    apiNotes:
      "Use the saved Karakeep integration and inherit its authentication. GET /api/v1/bookmarks with archived=false, sortOrder=desc, limit=8, includeContent=false returns {bookmarks,nextCursor}. content is a discriminated union: link has url/title, text has text/sourceUrl, asset has assetType/assetId, and unknown can have no useful payload.",
    preferredExampleId: "karakeep-bookmarks",
    previewResponses: [
      {
        pathIncludes: "/api/v1/bookmarks",
        response: {
          bookmarks: [
            {
              id: "link-1",
              title: "A useful article",
              favourited: true,
              summary: "A short generated summary.",
              note: null,
              tags: [{ id: "tag-1", name: "reading" }],
              content: { type: "link", url: "https://example.com/article", title: "A useful article" },
            },
            {
              id: "text-1",
              title: null,
              favourited: false,
              summary: null,
              note: "Remember this",
              tags: [],
              content: { type: "text", text: "Short saved thought", sourceUrl: null },
            },
            {
              id: "asset-1",
              title: null,
              favourited: false,
              summary: null,
              note: null,
              tags: [],
              content: { type: "asset", assetType: "pdf", assetId: "pdf-1" },
            },
            {
              id: "unknown-1",
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
    expectations: {
      sourceType: "integration",
      sourceIntegrationKind: "karakeep",
      minimumTemplateCharacters: 900,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/v1/bookmarks",
          trigger: "load",
          queryIncludes: { archived: "false", sortOrder: "desc", limit: "8", includeContent: "false" },
          requiresStatusBinding: true,
        },
      ],
      templateIncludes: [
        "RefreshButton",
        ".bookmarks",
        "nextCursor",
        "favourited",
        "content",
        "content?.title",
        "content?.text",
        "assetType",
        "summary",
        "note",
        "tags",
      ],
      templateIncludesAny: [
        ["Unknown bookmark", "Unknown content", "Unsupported bookmark"],
        ["Favorite", "Favourite"],
      ],
    },
  },
  {
    id: "seed-mealie-today",
    documentationUrl: "https://docs.mealie.io/documentation/getting-started/api-usage/",
    request:
      "Create the shipped Mealie Today widget using my saved Mealie integration. Render today's direct-array meal plan as a compact day view where recipe-backed and text-only entries remain useful. Show meal type, recipe name, servings, total time, rating, or title and text fallbacks, plus refresh and complete loading, empty, error, and success states.",
    apiNotes:
      "Use the saved Mealie integration and inherit its authentication. GET /api/households/mealplans/today returns a direct array. Each entry has entryType, title, text, recipeId, and nullable recipe; recipe can include name, slug, recipeServings, recipeYield, totalTime, and rating. This today view does not need to display or invent a timezone for the date-only field.",
    preferredExampleId: "mealie-today",
    previewResponses: [
      {
        pathIncludes: "/api/households/mealplans/today",
        response: [
          {
            id: 51,
            date: "2026-09-21",
            entryType: "dinner",
            title: "",
            text: "",
            recipeId: "recipe-1",
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
            id: 52,
            date: "2026-09-21",
            entryType: "snack",
            title: "Use the ripe bananas",
            text: "Before tomorrow",
            recipeId: null,
            recipe: null,
          },
        ],
      },
    ],
    expectations: {
      sourceType: "integration",
      sourceIntegrationKind: "mealie",
      minimumTemplateCharacters: 750,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/households/mealplans/today",
          trigger: "load",
          requiresStatusBinding: true,
        },
      ],
      templateIncludes: [
        "RefreshButton",
        "entryType",
        "recipe",
        "recipeServings",
        "totalTime",
        "rating",
        "title",
        "text",
      ],
      templateIncludesAny: [["Nothing planned", "No meals", "plan is empty"]],
    },
  },
  {
    id: "seed-romm-library",
    documentationUrl: "https://docs.romm.app/latest/developers/api-authentication/",
    request:
      "Create the shipped RomM Library Overview widget using my saved RomM integration. Combine platform, ROM, save, and state totals with six recently added games. Handle the items envelope, missing names, filesystem availability, platform, and creation date with independent refresh, loading, error, empty, and success states. Keep it text-first and do not render protected cover URLs.",
    apiNotes:
      "Use the saved RomM integration and inherit its authentication. GET /api/stats returns PLATFORMS, ROMS, SAVES, STATES, SCREENSHOTS, and TOTAL_FILESIZE_BYTES. GET /api/roms with limit=6, offset=0, order_by=created_at, order_dir=desc, with_char_index=false, with_filter_values=false, with_rom_id_index=false, with_total=false returns {items,total,limit,offset,...}.",
    preferredExampleId: "romm-library",
    previewResponses: [
      {
        pathIncludes: "/api/stats",
        response: {
          PLATFORMS: 14,
          ROMS: 824,
          SAVES: 39,
          STATES: 17,
          SCREENSHOTS: 61,
          TOTAL_FILESIZE_BYTES: 536_870_912_000,
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
              fs_size_bytes: 1_459_617_792,
              missing_from_fs: false,
            },
            {
              id: 43,
              name: null,
              fs_name_no_ext: "Unmatched Disc 01",
              platform_display_name: "Nintendo GameCube",
              created_at: "2026-09-19T12:20:00Z",
              fs_size_bytes: 1_395_864_371,
              missing_from_fs: true,
            },
          ],
          total: null,
          limit: 6,
          offset: 0,
          char_index: {},
          rom_id_index: [],
          filter_values: {},
        },
      },
    ],
    expectations: {
      sourceType: "integration",
      sourceIntegrationKind: "romm",
      minimumTemplateCharacters: 1_000,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/stats",
          trigger: "load",
          requiresStatusBinding: true,
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
            with_total: "false",
          },
          requiresStatusBinding: true,
        },
      ],
      templateIncludes: [
        "RefreshButton",
        "PLATFORMS",
        "ROMS",
        "SAVES",
        "STATES",
        ".items",
        "fs_name_no_ext",
        "platform_display_name",
        "created_at",
        "missing_from_fs",
      ],
      templateIncludesAny: [
        ["No games", "Nothing added"],
        ["Missing", "missing"],
      ],
    },
  },
  {
    id: "seed-tubearchivist-queue",
    documentationUrl: "https://docs.tubearchivist.com/api/docs/",
    request:
      "Create the shipped TubeArchivist Queue Health widget using my saved TubeArchivist integration. Combine channel counts, pending-download counts, and the first page of pending queue items. Show channel name, title, duration, message, type or status, honest page context, independent refresh and failures, and complete loading, empty, error, and success states without rendering authenticated thumbnails.",
    apiNotes:
      "Use the saved TubeArchivist integration and inherit its Authorization token. GET /api/stats/channel/ returns channel counts. GET /api/stats/download/ returns nullable pending counts. GET /api/download/ with filter=pending,page=0 returns {data,paginate}; page 0 is the first page.",
    preferredExampleId: "tubearchivist-queue",
    previewResponses: [
      {
        pathIncludes: "/api/stats/channel/",
        response: {
          doc_count: 86,
          active_true: 81,
          active_false: 5,
          subscribed_true: 42,
          subscribed_false: 44,
        },
      },
      {
        pathIncludes: "/api/stats/download/",
        response: {
          pending: 13,
          ignore: null,
          pending_videos: 9,
          pending_shorts: null,
          pending_streams: 4,
        },
      },
      {
        pathIncludes: "/api/download/",
        response: {
          data: [
            {
              youtube_id: "w7Ft2ymGmfc",
              title: "Building a resilient home server",
              channel_name: "Homelab Notes",
              duration: "18:42",
              message: "",
              published: "20260919",
              status: "pending",
              timestamp: 1_789_843_200,
              vid_type: "videos",
            },
            {
              youtube_id: "short-health",
              title: "Quick rack tour",
              channel_name: "Homelab Notes",
              duration: "00:58",
              message: "Metadata retry pending",
              published: null,
              status: "pending",
              timestamp: null,
              vid_type: "shorts",
            },
          ],
          paginate: {
            page_size: 12,
            current_page: 0,
            last_page: 2,
            next_pages: [1, 2],
            total_hits: 13,
          },
        },
      },
    ],
    expectations: {
      sourceType: "integration",
      sourceIntegrationKind: "tubearchivist",
      minimumTemplateCharacters: 1_100,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/stats/channel/",
          trigger: "load",
          requiresStatusBinding: true,
        },
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/stats/download/",
          trigger: "load",
          requiresStatusBinding: true,
        },
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/download/",
          trigger: "load",
          queryIncludes: { filter: "pending", page: "0" },
          requiresStatusBinding: true,
        },
      ],
      templateIncludes: [
        "RefreshButton",
        "doc_count",
        "subscribed_true",
        "pending",
        "pending_videos",
        "pending_shorts",
        "pending_streams",
        ".data",
        "channel_name",
        "duration",
        "message",
        "vid_type",
        "paginate",
        "current_page",
        "last_page",
        "total_hits",
      ],
      templateIncludesAny: [["Queue is clear", "No pending downloads", "Nothing queued"]],
    },
  },
  {
    id: "seed-frigate-alerts",
    documentationUrl: "https://docs.frigate.video/integrations/api/review-review-get/",
    request:
      "Create the shipped Frigate Review Alerts widget using my saved Frigate integration. Show at most ten unreviewed alerts from the last 24 hours with camera, severity or active state, start time, reviewed state, objects, verified objects, zones, refresh, and complete loading, empty, error, and success states. Do not render protected relative thumbnails.",
    apiNotes:
      "Use the saved Frigate integration and inherit its connection settings. GET /api/review with reviewed=0, severity=alert, limit=10 returns a direct array. start_time and nullable end_time are Unix seconds. Filter the returned array client-side to start_time >= current Unix time minus 86400; do not invent date parameters.",
    preferredExampleId: "frigate-alerts",
    previewResponses: [
      {
        pathIncludes: "/api/review",
        response: [
          {
            id: "1789957430.014544-vgnctm",
            camera: "front_door",
            start_time: 1_789_957_430.014544,
            end_time: null,
            severity: "alert",
            has_been_reviewed: false,
            data: {
              detections: ["detection-1"],
              objects: ["person", "car"],
              verified_objects: ["person"],
              sub_labels: [],
              zones: ["porch"],
              audio: [],
            },
          },
        ],
      },
    ],
    expectations: {
      sourceType: "integration",
      sourceIntegrationKind: "frigate",
      minimumTemplateCharacters: 900,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/review",
          trigger: "load",
          queryIncludes: { reviewed: "0", severity: "alert", limit: "10" },
          requiresStatusBinding: true,
        },
      ],
      templateIncludes: [
        "RefreshButton",
        "start_time",
        "end_time",
        "camera",
        "severity",
        "has_been_reviewed",
        "objects",
        "verified_objects",
        "zones",
        "86400",
      ],
      templateIncludesAny: [
        ["Active", "Ongoing", "In progress"],
        ["All clear", "No recent", "No alerts"],
      ],
    },
  },
  {
    id: "seed-frigate-system",
    documentationUrl: "https://docs.frigate.video/integrations/api/stats-stats-get/",
    request:
      "Create the shipped Frigate System Metrics widget using my saved Frigate integration. Show service version and uptime, aggregate camera, detection, process, and skipped FPS, per-camera connection quality, reconnects and stalls, detector inference speed, storage usage, refresh, and complete loading, error, and success states in a responsive layout.",
    apiNotes:
      "Use the saved Frigate integration and inherit its connection settings. GET /api/stats returns a direct object with camera_fps, detection_fps, process_fps, skipped_fps, cameras, detectors, and service. service contains version, uptime, and a dynamic storage record; cameras and detectors are dynamic records. Detector inference_speed values are milliseconds. Storage free, used, and total values are decimal megabytes, matching Frigate's Prometheus conversion to bytes.",
    preferredExampleId: "frigate-system",
    previewResponses: [
      {
        pathIncludes: "/api/stats",
        response: {
          camera_fps: 5,
          detection_fps: 1.4,
          process_fps: 4.9,
          skipped_fps: 0.1,
          cameras: {
            front_door: {
              camera_fps: 5,
              connection_quality: "excellent",
              reconnects_last_hour: 0,
              stalls_last_hour: 0,
            },
            driveway: {
              camera_fps: 4.7,
              connection_quality: "fair",
              reconnects_last_hour: 2,
              stalls_last_hour: 1,
            },
          },
          detectors: { coral: { inference_speed: 8.4 } },
          service: {
            uptime: 86_400,
            version: "0.16.1",
            storage: {
              "/media/frigate/recordings": { free: 500, used: 250, total: 750, mount_type: "ext4" },
            },
          },
        },
      },
    ],
    expectations: {
      sourceType: "integration",
      sourceIntegrationKind: "frigate",
      minimumTemplateCharacters: 1_100,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/stats",
          trigger: "load",
          requiresStatusBinding: true,
        },
      ],
      templateIncludes: [
        "RefreshButton",
        "camera_fps",
        "detection_fps",
        "process_fps",
        "skipped_fps",
        "cameras",
        "connection_quality",
        "reconnects_last_hour",
        "stalls_last_hour",
        "detectors",
        "inference_speed",
        "service",
        "version",
        "uptime",
        "storage",
      ],
    },
  },
  {
    id: "seed-frigate-live-streams",
    documentationUrl: "https://docs.frigate.video/integrations/api/go-2-rtc-streams-go-2-rtc-streams-get/",
    request:
      "Create the shipped Frigate Stream Readiness widget using my saved Frigate integration. Show every configured go2rtc stream with producer and consumer counts, safe media descriptors, live or offline state, refresh, and complete loading, empty, error, and success states. Never expose producer URLs, remote addresses, credentials, or pretend the JSON runtime embeds protected live video.",
    apiNotes:
      "Use the saved Frigate integration and inherit its connection settings. GET /api/go2rtc/streams returns a dynamic object keyed by stream name. Each value can contain producers and consumers arrays; producers can contain a medias array. Render counts and medias only, never producer.url, remote_addr, token values, or other connection URLs.",
    preferredExampleId: "frigate-live-streams",
    previewResponses: [
      {
        pathIncludes: "/api/go2rtc/streams",
        response: {
          front_door: {
            producers: [{ medias: ["video, recvonly, H264", "audio, recvonly, AAC"] }],
            consumers: [{ id: "consumer-1" }],
          },
          driveway: {
            producers: [],
            consumers: [],
          },
        },
      },
    ],
    expectations: {
      sourceType: "integration",
      sourceIntegrationKind: "frigate",
      minimumTemplateCharacters: 750,
      requests: [
        {
          kind: "query",
          method: "GET",
          pathIncludes: "/api/go2rtc/streams",
          trigger: "load",
          requiresStatusBinding: true,
        },
      ],
      templateIncludes: ["RefreshButton", "Object.entries", "producers", "consumers", "medias"],
      templateIncludesAny: [
        ["Live", "Ready", "Online"],
        ["Offline", "No active producer"],
        ["No live streams", "No streams"],
      ],
    },
  },
] as const;
