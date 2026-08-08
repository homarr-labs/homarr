export interface CustomWidgetAiEvaluationCase {
  id: string;
  request: string;
  documentationUrl: string;
  apiNotes: string;
}

export const CUSTOM_WIDGET_AI_EVALUATION_CASES: readonly CustomWidgetAiEvaluationCase[] = [
  {
    id: "pokedex",
    documentationUrl: "https://pokeapi.co/docs/v2",
    request:
      "Create a polished Pokédex browser with searchable Pokémon, a responsive result grid, manual detail loading, sprites, types, abilities, base-stat progress bars, and clear loading, empty, and failure states.",
    apiNotes:
      "Use GET /api/v2/pokemon?limit=<option>&offset=<option> for the list and GET /api/v2/pokemon/{param:name} as a manual detail query. PokeAPI needs no authentication.",
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
] as const;
