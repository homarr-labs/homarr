export interface CustomWidgetAiExpectation {
  sourceBaseUrl: string;
  sourceNetworkScope?: "public" | "private" | "loopback";
  sourceAuth: "none" | "bearer" | "basic" | "apiKeyHeader" | "apiKeyQuery";
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
] as const;
