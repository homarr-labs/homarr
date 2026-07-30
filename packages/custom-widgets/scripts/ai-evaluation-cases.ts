export interface CustomWidgetAiEvaluationCase {
  id: string;
  request: string;
  documentationUrl: string;
  apiNotes: string;
  acceptance: {
    sourceAuth?: { type: "none" | "bearer" | "apiKeyHeader" | "apiKeyQuery"; name?: string };
    requestRules: ReadonlyArray<{
      label: string;
      pathIncludes: string;
      kind?: "query" | "action";
      method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      trigger?: "load" | "manual";
      optionReference?: boolean;
      parameterReference?: boolean;
      invalidates?: boolean;
    }>;
    templateComponents: readonly string[];
  };
}

export const CUSTOM_WIDGET_AI_EVALUATION_CASES: readonly CustomWidgetAiEvaluationCase[] = [
  {
    id: "pokedex",
    documentationUrl: "https://pokeapi.co/docs/v2",
    request:
      "Create a polished Pokédex browser with searchable Pokémon, a responsive result grid, manual detail loading, sprites, types, abilities, base-stat progress bars, and clear loading, empty, and failure states.",
    apiNotes:
      "Use GET /api/v2/pokemon?limit=<option>&offset=<option> for the list and GET /api/v2/pokemon/{param:name} as a manual detail query. PokeAPI needs no authentication.",
    acceptance: {
      sourceAuth: { type: "none" },
      requestRules: [
        { label: "Pokémon list", pathIncludes: "/api/v2/pokemon", kind: "query", trigger: "load" },
        {
          label: "manual Pokémon detail",
          pathIncludes: "/api/v2/pokemon/",
          kind: "query",
          trigger: "manual",
          parameterReference: true,
        },
      ],
      templateComponents: ["TextInput", "SubFetch", "Image", "Progress"],
    },
  },
  {
    id: "portainer-containers",
    documentationUrl: "https://docs.portainer.io/api/examples",
    request:
      "Create an excellent Portainer container dashboard: environment option, running/stopped summary, responsive container list, health/status badges, and explicit start, stop, and restart actions with confirmation and refresh after success.",
    apiNotes:
      "Use X-API-Key auth. List containers with GET /api/endpoints/{option:endpointId}/docker/containers/json?all=true. Actions are POST /api/endpoints/{option:endpointId}/docker/containers/{param:id}/start, /stop, and /restart and invalidate the list query.",
    acceptance: {
      sourceAuth: { type: "apiKeyHeader", name: "X-API-Key" },
      requestRules: [
        {
          label: "container list",
          pathIncludes: "/containers/json",
          kind: "query",
          optionReference: true,
        },
        {
          label: "start action",
          pathIncludes: "/start",
          kind: "action",
          method: "POST",
          parameterReference: true,
          invalidates: true,
        },
        {
          label: "stop action",
          pathIncludes: "/stop",
          kind: "action",
          method: "POST",
          parameterReference: true,
          invalidates: true,
        },
        {
          label: "restart action",
          pathIncludes: "/restart",
          kind: "action",
          method: "POST",
          parameterReference: true,
          invalidates: true,
        },
      ],
      templateComponents: ["ActionButton", "Badge", "RefreshButton"],
    },
  },
  {
    id: "football-dashboard",
    documentationUrl: "https://docs.football-data.org/general/v4/competition.html",
    request:
      "Create a polished football dashboard with a competition selector, league table, upcoming fixtures, club crests, match status and kickoff time. It must be highly scannable in narrow and wide tiles, refreshable, and include complete loading, empty, and error states.",
    apiNotes:
      "Use https://api.football-data.org/v4 with X-Auth-Token authentication. GET /competitions/{option:competition}/standings returns standings[].table with position, team, playedGames, won, draw, lost, points and goalDifference. GET /competitions/{option:competition}/matches with query status=SCHEDULED returns matches with utcDate, status, homeTeam, awayTeam and score. Use fixed choices such as PL, CL, PD, BL1, SA and FL1 for the competition option.",
    acceptance: {
      sourceAuth: { type: "apiKeyHeader", name: "X-Auth-Token" },
      requestRules: [
        {
          label: "competition standings",
          pathIncludes: "/standings",
          kind: "query",
          optionReference: true,
        },
        {
          label: "competition fixtures",
          pathIncludes: "/matches",
          kind: "query",
          optionReference: true,
        },
      ],
      templateComponents: ["Table", "Image", "Badge", "RefreshButton"],
    },
  },
  {
    id: "jellyfin-activity",
    documentationUrl: "https://api.jellyfin.org/",
    request:
      "Create a premium Jellyfin overview with movie, series, episode and song totals plus active playback sessions. Show user, title, client, play method, progress, paused/playing state and a calm empty state when nothing is playing. It must remain useful in narrow and wide tiles.",
    apiNotes:
      "Use the user's Jellyfin server URL with private network scope and X-Emby-Token authentication. GET /Items/Counts returns MovieCount, SeriesCount, EpisodeCount and SongCount. GET /Sessions with query activeWithinSeconds=300 returns sessions; active playback has NowPlayingItem, UserName, Client, PlayState.PositionTicks, PlayState.IsPaused and TranscodingInfo or NowPlayingItem.RunTimeTicks. Do not invent playback-control actions.",
    acceptance: {
      sourceAuth: { type: "apiKeyHeader", name: "X-Emby-Token" },
      requestRules: [
        { label: "library counts", pathIncludes: "/Items/Counts", kind: "query" },
        { label: "active sessions", pathIncludes: "/Sessions", kind: "query" },
      ],
      templateComponents: ["Progress", "Badge", "RefreshButton"],
    },
  },
  {
    id: "home-assistant-control",
    documentationUrl: "https://developers.home-assistant.io/docs/api/rest/",
    request:
      "Create a refined Home Assistant room widget with temperature and humidity readings, light status, a room/entity option, and an actionable light toggle. Use calm hierarchy and responsive controls, not a pile of nested cards.",
    apiNotes:
      "Use bearer auth. GET /api/states/{option:sensorEntity} and /api/states/{option:lightEntity} load entity state. POST /api/services/light/turn_on and /turn_off accept a body with entity_id from an option and should invalidate the light query.",
    acceptance: {
      sourceAuth: { type: "bearer" },
      requestRules: [
        {
          label: "sensor state",
          pathIncludes: "/api/states/",
          kind: "query",
          optionReference: true,
        },
        {
          label: "light state",
          pathIncludes: "/api/states/",
          kind: "query",
          optionReference: true,
        },
        {
          label: "light on action",
          pathIncludes: "/api/services/light/turn_on",
          kind: "action",
          method: "POST",
          optionReference: true,
          invalidates: true,
        },
        {
          label: "light off action",
          pathIncludes: "/api/services/light/turn_off",
          kind: "action",
          method: "POST",
          optionReference: true,
          invalidates: true,
        },
      ],
      templateComponents: ["ToggleSwitch", "Badge", "SimpleGrid"],
    },
  },
] as const;
