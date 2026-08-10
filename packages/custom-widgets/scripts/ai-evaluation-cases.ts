export interface CustomWidgetAiEvaluationCase {
  id: string;
  request: string;
  documentationUrl: string;
  apiNotes: string;
  sampleResponse?: unknown;
  previewResponses?: Array<{
    pathIncludes: string;
    response: unknown;
  }>;
  minimumPreviewCycles?: number;
  expectations?: {
    sourceBaseUrl: string;
    sourceAuth: "none" | "apiKeyQuery";
    sourceAuthName?: string;
    requests: Array<{
      kind: "query" | "action";
      method: "GET" | "POST";
      pathIncludes: string;
      trigger?: "load" | "manual";
      queryIncludes?: Record<string, string>;
    }>;
    templateIncludes?: string[];
  };
}

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
] as const;
