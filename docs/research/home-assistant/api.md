# Home Assistant external API research (for the Homarr integration rebuild)

Sources (all primary). Abbreviations used for citations:

- **REST docs** https://developers.home-assistant.io/docs/api/rest/ (raw: https://raw.githubusercontent.com/home-assistant/developers.home-assistant/master/docs/api/rest.md)
- **WS docs** https://developers.home-assistant.io/docs/api/websocket/ (raw: .../master/docs/api/websocket.md)
- **Auth docs** https://developers.home-assistant.io/docs/auth_api (raw: .../master/docs/auth_api.md)
- **core** = `https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/<path>` (read on dev branch, 2026-11-06)
- **jsws** = `https://raw.githubusercontent.com/home-assistant/home-assistant-js-websocket/master/lib/<file>` (note: the library's source dir is `lib/`, not `src/`)

> Items marked **(unverified)** were not confirmed in source during this pass.

---

## 0. Top 10 facts for implementation

1. **Auth**: `Authorization: Bearer <long-lived token>` on REST; for WS send `{"type":"auth","access_token":...}` after `auth_required`. LLATs last 10 years. ([Auth docs](https://developers.home-assistant.io/docs/auth_api))
2. **Most useful registries are readable by non-admin users**: `config/{area,floor,label,device,entity}_registry/list` and `list_for_display` have no `@require_admin` (admin only on create/update/delete). So a token for a normal user can read areas/floors/labels. ([core config/area_registry.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/config/area_registry.py), [floor_registry.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/config/floor_registry.py), [label_registry.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/config/label_registry.py), [entity_registry.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/config/entity_registry.py), [device_registry.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/config/device_registry.py))
3. **REST has NO registry endpoints**. Areas/floors/labels over REST are only possible via `POST /api/template` — which is **`@require_admin`** (WS `render_template` is NOT admin-gated). So prefer WS registry lists. ([core api/__init__.py APITemplateView](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/api/__init__.py), [websocket_api/commands.py `handle_render_template`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/websocket_api/commands.py))
4. **Area of an entity** = entity registry `area_id` if set, else its device's `area_id`. Compressed `list_for_display` gives `ai` (area_id) and `di` (device_id) per entity; you must resolve `di -> device.area_id` from `config/device_registry/list`. (Keys from [core helpers/entity_registry.py `_as_display_dict`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/helpers/entity_registry.py); device fields from [helpers/device_registry.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/helpers/device_registry.py).) Alternative: `{{ area_id('light.x') }}` template resolves entity→device→area for you ([helpers/template/extensions/areas.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/helpers/template/extensions/areas.py)).
5. **Service responses**: REST `POST /api/services/<domain>/<service>?return_response` returns `{"changed_states":[...],"service_response":{...}}` instead of a bare list. Without the flag: services with `SupportsResponse.ONLY` (`calendar.get_events`, `todo.get_items`, `weather.get_forecasts`) return **400**; with the flag, services with `SupportsResponse.NONE` return 400. ([core api/__init__.py `APIDomainServicesView`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/api/__init__.py))
6. **Prefer one WS connection** with `subscribe_entities` (compressed, diff-based) + registries fetched once (and refetched on registry update events) over polling `GET /api/states` (full dump of every entity incl. attributes, gzip-compressed above a size threshold). Use REST for history/camera/calendar/service calls where WS isn't convenient. (Format: [jsws states.ts](https://raw.githubusercontent.com/home-assistant/home-assistant-js-websocket/master/lib/states.ts))
7. **WS `subscribe_entities` format** is `{a:{id:{s,a,c,lc,lu}}}` initial, then `{a:{...}, r:[ids], c:{id:{"+":{s,a,c,lc,lu}, "-":{a:[removedAttrKeys]}}}}` diffs; timestamps are epoch **seconds** (float). Context `c` may be a plain string = context id. If `lc` present it also applies to `lu`. (Full detail §3.4.)
8. **Camera/image/media-player proxy endpoints use `requires_auth = False`** and accept either a Bearer header OR `?token=<access token from entity_picture>`; tokens rotate every 5 minutes (`TOKEN_CHANGE_INTERVAL`). Server-side with a Bearer header is simplest and always works. Bad-token-without-header → 403 (not 401) by design. ([core camera/__init__.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/camera/__init__.py), [image/__init__.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/image/__init__.py), [media_player/__init__.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/media_player/__init__.py))
9. **Admin-only** (verified `@require_admin`): REST `GET /api/stream` (event stream), `POST /api/events/<type>`, `POST /api/template`, `GET /api/error_log`, `POST/DELETE /api/states/<id>`; WS `subscribe_trigger`, `test_condition`, `execute_script`, `fire_event`, `subscribe_system_state`, `integration/descriptions`, `logbook/get_action_calls`, all registry create/update/delete/reorder, `energy/save_prefs`, repairs fix-flow ops. **Not** admin: `get_states`, `get_services`, `get_config`, `subscribe_entities`, `subscribe_events`, `call_service`, `render_template`, `manifest/list`, `system_health/info`, `repairs/list_issues`, `search/related`, `history/*`, `logbook/event_stream`, `recorder/statistics_during_period`, `todo/item/*`, `weather/subscribe_forecast`, `calendar/event/subscribe`, `camera/stream`, `energy/get_prefs`. (Per-file greps below.) Non-admin users still have per-entity read policy filtering on states/history/calendars.
10. **Node 22+ has a global `WebSocket`** (WHATWG client, stable in Node 22) — enough for the HA protocol (the js-websocket library itself just does `new WebSocket(url)`; [jsws socket.ts](https://raw.githubusercontent.com/home-assistant/home-assistant-js-websocket/master/lib/socket.ts)). Remember to send `supported_features {coalesce_messages:1}` as message id 1 after `auth_ok` if you want coalesced batches (then incoming frames may be JSON **arrays** of messages).

---

## 1. Auth

### 1.1 Long-lived access token
- Created in the user's profile; valid 10 years; can also be minted via WS `auth/long_lived_access_token` `{id,type,client_name,lifespan(days)}`. ([Auth docs](https://developers.home-assistant.io/docs/auth_api))
- REST: header `Authorization: Bearer TOKEN` (+ `Content-Type: application/json`). ([REST docs](https://developers.home-assistant.io/docs/api/rest/))
- REST docs list possible error codes: `400, 401, 404, 405` (success `200`/`201`). ([REST docs](https://developers.home-assistant.io/docs/api/rest/))
- 401 = missing/invalid token. Non-admin hitting an admin-only view → `require_admin` raises `Unauthorized` (handled by the view wrapper as 401; see comment in `APIDomainServicesView`: "Handled by the view wrapper, which maps it to 401"). **403** appears only where deliberately returned: camera/image/media-player proxy views with `?token=` that is invalid and no `Authorization` header present. ([core camera/__init__.py `CameraView.get`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/camera/__init__.py)) (REST 401-for-admin-gate behaviour: inferred from view wrapper comment; treat both 401/403 as "auth/permission problem".)
- Repeated bad Bearer attempts feed HA's IP ban middleware (comment in `CameraView.get`: failed request with Authorization header → 401 "let the ban middleware count it as a wrong login"). Don't hammer with a wrong token.

### 1.2 `GET /api/` and `GET /api/config`
- `GET /api/` → `{"message":"API running."}` (trailing slash required). ([REST docs](https://developers.home-assistant.io/docs/api/rest/); [core `APIStatusView`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/api/__init__.py))
- `GET /api/config` returns `hass.config.as_dict()`; WS `get_config` returns the same dict, **but if the user is `local_only`, `external_url` is removed**. ([core core_config.py `as_dict`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/core_config.py); [commands.py `handle_get_config`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/websocket_api/commands.py))

Current keys (verified in source):
```
allowlist_external_dirs: string[], allowlist_external_urls: string[],
components: string[]   // loaded integrations AND platform pairs like "sensor.cpuspeed"
config_dir, config_source, country, currency, debug, elevation,
external_url, internal_url, language, latitude, location_name,
logging: {log_file_disabled_reason}, longitude, radius,
recovery_mode, safe_mode, state ("RUNNING"...), time_zone,
unit_system: {length, mass, temperature, volume, (accumulated_precipitation, area, conversions?, pressure, wind_speed …)} // from units.as_dict()
version: "2026.x.y", whitelist_external_dirs (legacy)
```
Old docs sample shows only `unit_system {length,mass,temperature,volume}` ([REST docs](https://developers.home-assistant.io/docs/api/rest/)); the full key set of `units.as_dict()` was not fetched **(unverified)**.
- `GET /api/core/state` (lightweight): `{"state": "RUNNING", "recorder_state": {"migration_in_progress":bool,"migration_is_live":bool}}` ([core `APICoreStateView`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/api/__init__.py)).

### 1.3 Admin gating summary
Verified by reading decorators in source (`@require_admin`):

| Area | Admin-only | Not admin |
|---|---|---|
| REST api/__init__ | `/api/stream`, `POST /api/events/{type}`, `POST /api/template`, `GET /api/error_log`, `POST|DELETE /api/states/{id}` | `/api/`, `/api/config`, `/api/states`, `GET /api/states/{id}`, `/api/services` (+POST), `/api/components`, `/api/events` (listeners), `/api/core/state` |
| WS core commands.py | `subscribe_system_state`, `dismiss_system_state`, `subscribe_trigger`, `test_condition`, `execute_script`, `fire_event`, `integration/descriptions` | `subscribe_events`, `unsubscribe_events`, `call_service`, `get_states`, `subscribe_entities`, `get_services`, `get_config`, `manifest/list`, `manifest/get`, `ping`, `render_template`, `entity/source`, `subscribe_condition`, `validate_config`, `supported_features`, `extract_from_target` etc. |
| WS registries | create/update/delete/reorder (area/floor/label), device update/remove, entity update/remove/settings update | all `list`, `list_for_display`, `get`, `get_entries` |
| logbook | `logbook/get_action_calls` | `logbook/event_stream`, `logbook/get_events` |
| energy | `energy/save_prefs` | `energy/get_prefs`, `energy/info`, `energy/validate`, `energy/solar_forecast`, `energy/fossil_energy_consumption` |
| camera | `camera/update_prefs` | `camera/stream`, `camera/capabilities`, `camera/get_prefs` |
| repairs | fix-flow/ignore decorated `@require_admin(permission=POLICY_EDIT)` on HTTP flow views | `repairs/list_issues`, `repairs/get_issue_data`, `repairs/ignore_issue` WS commands (no decorator seen) |
| system_health | — | `system_health/info` (no decorator seen) |
| search | — | `search/related` (no decorator seen) |

Sources: [api/__init__.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/api/__init__.py), [websocket_api/commands.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/websocket_api/commands.py), config registries (links in §0), [logbook/websocket_api.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/logbook/websocket_api.py), [energy/websocket_api.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/energy/websocket_api.py), [camera/__init__.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/camera/__init__.py), [repairs/websocket_api.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/repairs/websocket_api.py), [system_health/__init__.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/system_health/__init__.py), [search/__init__.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/search/__init__.py).

---

## 2. REST endpoints

Base: `<base_url>/api/...`, all JSON, Bearer auth unless noted. ([REST docs](https://developers.home-assistant.io/docs/api/rest/))

| Method + path | Notes |
|---|---|
| `GET /api/` | `{"message":"API running."}` |
| `GET /api/config` | §1.2 |
| `GET /api/components` | `string[]` of loaded components ([core `APIComponentsView`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/api/__init__.py)) |
| `GET /api/events` | list of `{event: name, listener_count: n}` (view in api/__init__ `APIEventListenersView`; shape not re-verified) |
| `GET /api/states` | `State[]`; non-admin gets only entities readable by policy; response gzip-enabled when body > `MIN_COMPRESSED_RESPONSE_SIZE` ([core `APIStatesView`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/api/__init__.py)) |
| `GET /api/states/<entity_id>` | one `State`; 404 `{"message":"Entity not found."}` |
| `POST /api/states/<entity_id>` | admin; body `{state, attributes?, force_update?}` → 200/201 (creates virtual state only) |
| `GET /api/services` | list of `{domain, services:{name:{name,description,fields,target?,response?}}}` ([core `APIServicesView`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/api/__init__.py)) |
| `POST /api/services/<domain>/<service>` | §2.2 |
| `GET /api/history/period[/<ts>]` | §2.3 |
| `GET /api/logbook[/<ts>]` | §2.4 |
| `GET /api/camera_proxy/<entity_id>` | §2.5 |
| `GET /api/camera_proxy_stream/<entity_id>` | MJPEG; `?interval=<seconds>` composes stream from stills |
| `GET /api/image_proxy/<image_entity_id>` | §2.5 |
| `GET /api/media_player_proxy/<entity_id>` | §2.5 |
| `GET /api/calendars` | `[{"name","entity_id"}]` sorted by name; read policy filtered ([core calendar `CalendarListView`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/calendar/__init__.py)) |
| `GET /api/calendars/<entity_id>?start=<iso>&end=<iso>` | §2.6 |
| `POST /api/template` | admin; §2.7 |
| `GET /api/error_log` | admin; plain text of `home-assistant.log` |
| `POST /api/config/core/check_config` | admin; `{"result":"valid"\|"invalid","errors":null\|"..."}` ([REST docs](https://developers.home-assistant.io/docs/api/rest/)); not re-verified in source |
| `GET /api/stream` | admin, SSE; `?restrict=event1,event2` |

### 2.1 State object
```json
{"entity_id":"light.x","state":"on","attributes":{"friendly_name":"…","supported_features":44,"entity_picture":"/api/camera_proxy/camera.x?token=…","device_class":"…","unit_of_measurement":"°C"},"last_changed":"2016-05-30T21:43:32.418320+00:00","last_updated":"…","context":{"id":"…","parent_id":null,"user_id":"…"}}
```
([REST docs `/api/states`](https://developers.home-assistant.io/docs/api/rest/))
`supported_features` is an attribute on the state; `entity.get_supported_features` reads the state attribute (else registry) ([core helpers/entity.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/helpers/entity.py)). It is a bitmask integer specific to each domain's `*EntityFeature` enum. Entities can be `unavailable`/`unknown`.

### 2.2 `POST /api/services/<domain>/<service>`
Request: JSON object of service data (e.g. `{"entity_id":"light.x","brightness":128}`; target keys `entity_id`/`device_id`/`area_id`/`floor_id`/`label_id` go in the same body). Empty body ok. Invalid JSON → 400 "Data should be valid JSON.".
Behaviour (all from [core api/__init__.py `APIDomainServicesView.post`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/api/__init__.py)):
- Call is **blocking** (`blocking=True`); waits until the service finishes.
- Unknown service → 400 (ServiceNotFound).
- Default response: array of `State` objects changed **by that call's context** (docs tip: includes any state change during the call).
- `?return_response` (present = true; value ignored — the code tests `"return_response" in request.query`):
  - response → `{"changed_states": State[], "service_response": {...}}`
  - If service `SupportsResponse.NONE` → 400 `"Service does not support responses. Remove return_response from request."`
  - If service `SupportsResponse.ONLY` and flag missing → 400 `"Service call requires responses but caller did not ask for responses. Add ?return_response to query parameters."`
  - `SupportsResponse.OPTIONAL` works with or without.
- Validation errors → 400 with message; `HomeAssistantError` → 500 with message.

Docs example of `service_response` keyed by entity_id: `{"service_response":{"weather.new_york_forecast":{"forecast":[...]}}}` ([REST docs](https://developers.home-assistant.io/docs/api/rest/)).

### 2.3 `GET /api/history/period[/<timestamp>]`
Source: [core history/__init__.py `HistoryPeriodView`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/history/__init__.py); docs: [REST docs](https://developers.home-assistant.io/docs/api/rest/).

| Param | Behaviour |
|---|---|
| path `<timestamp>` | ISO-8601; optional, default = now − 1 day; invalid → 400 "Invalid datetime"; future → `[]` |
| `filter_entity_id` | **required** (comma-separated; lowercased) else 400 "filter_entity_id is missing" |
| `end_time` | URL-encoded ISO; default start + 1 day; invalid → 400 |
| `skip_initial_state` | presence flag → don't include state at start time (undocumented in the docs page but in source) |
| `significant_changes_only` | default on; `=0` disables |
| `minimal_response` | presence flag; only `last_changed` + `state` for entries other than first/last |
| `no_attributes` | presence flag; omits attributes |

Response: array of arrays (one inner array per entity, ordered by time), each element a state-like object (`entity_id,state,attributes,last_changed,last_updated`; minimal form `{"last_changed","state"}`). Non-admin: entities filtered by read permission, empty → `[]`.

### 2.4 `GET /api/logbook/<timestamp>`
REST docs: optional `entity=<entity_id>`, `end_time=<timestamp>`; returns array of `{"when","name","message","entity_id","state","domain","context_user_id"}` ([REST docs](https://developers.home-assistant.io/docs/api/rest/)). Logbook REST view source not fetched (`logbook/__init__.py` didn't contain url/regex hits in this pass) **(unverified in source)**; prefer WS `logbook/event_stream` / `logbook/get_events`.

### 2.5 Image-like proxies
All three set `requires_auth = False` and authenticate manually:
- `GET /api/camera_proxy/<entity_id>[?width=&height=]` → raw image bytes + content-type; entity not found → 404 if authenticated else 401; camera off → 503; image error → 500. Auth: `KEY_AUTHENTICATED` (Bearer) **or** `?token=` ∈ `camera.access_tokens`. Bad token and no Authorization header → **403**; bad Bearer → 401. ([core camera/__init__.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/camera/__init__.py))
- `GET /api/camera_proxy_stream/<entity_id>[?interval=s]` → MJPEG stream. Same file.
- `GET /api/image_proxy/<image_entity_id>` and `/api/image_proxy_stream/<id>`: token = image entity `access_tokens`. ([core image/__init__.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/image/__init__.py))
- `GET /api/media_player_proxy/<entity_id>`: token = `player.access_token`. ([core media_player/__init__.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/media_player/__init__.py))
- The `entity_picture` state attribute is a **relative URL** like `/api/camera_proxy/camera.x?token=abc` (HA convention; tokens regenerate every 5 min — `TOKEN_CHANGE_INTERVAL = timedelta(minutes=5)` in camera/__init__.py). For a Node proxy: take `entity_picture` as-is, prefix base URL and also send Bearer — or just request `/api/camera_proxy/<id>` with Bearer and ignore the token.
- Live view: WS `camera/stream {entity_id, format: "hls"}` returns `{"url": "<relative HLS url>"}` ([camera/__init__.py `websocket_camera_stream`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/camera/__init__.py)); the `format` enum is `OUTPUT_FORMATS` (hls default).

### 2.6 `GET /api/calendars/<entity_id>?start=&end=`
- `start` and `end` **required** (parsed by `dt_util.parse_datetime`), `start <= end`, else **400** (empty body). Unknown/non-calendar entity → 400. Read-policy denied → 401.
- Response: array of events in the **API format** (`api_event_dict_factory`): datetimes become objects `{"dateTime": "<local iso>"}` or all-day `{"date": "YYYY-MM-DD"}`:
```json
[{"summary":"Meeting","start":{"dateTime":"2026-11-06T10:00:00+01:00"},"end":{"dateTime":"…"},"description":"…","location":"…","uid":"…","recurrence_id":null,"rrule":null}]
```
Field names are the CalendarEvent dataclass fields (`start,end,summary,description,location,uid,recurrence_id,rrule`) — dataclass field list inferred from `calendar/entity.py` / `WEBSOCKET_EVENT_SCHEMA` constants; verify against a live instance **(partially unverified)**. Sources: [core calendar/__init__.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/calendar/__init__.py), [calendar/helper.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/calendar/helper.py).

### 2.7 `POST /api/template` — areas/floors/labels via templates
- Admin only. Body `{"template": "...", "variables": {...}}`; returns **plain text** (`parse_result=False`), errors → 400 `"Error rendering template: …"`. ([core `APITemplateView`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/api/__init__.py))
- To get structured output, render JSON with `{{ ... | tojson }}` and `JSON.parse` client-side.
- Template functions verified to exist in extension files (all `as_global=True`; most also filters) — [areas.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/helpers/template/extensions/areas.py), [floors.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/helpers/template/extensions/floors.py), [labels.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/helpers/template/extensions/labels.py), [devices.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/helpers/template/extensions/devices.py):

| Function | Signature / returns |
|---|---|
| `areas()` | `list[str]` of all area ids |
| `area_id(lookup)` | area id from area name, alias, device id **or entity id** |
| `area_name(lookup)` | area name from area id, device id, or entity id |
| `area_entities(area_id_or_name)` | entity ids in the area |
| `area_devices(area_id_or_name)` | device ids in the area |
| `floors()` | all floor ids |
| `floor_id(lookup)`, `floor_name(lookup)` | resolve by name/area/etc. |
| `floor_areas(floor)` | area ids on a floor |
| `floor_entities(floor)` | entity ids on a floor |
| `labels()` | all label ids (also takes optional lookup: a labels-of-X variant — signature not re-verified) |
| `label_id(name)`, `label_name(id)`, `label_description(id)` | |
| `label_areas(label)`, `label_devices(label)`, `label_entities(label)` | |
| `device_entities(device_id)`, `device_id(entity_id)`, `device_name(id)`, `device_attr(device_or_entity, attr)` | `device_attr(x,'area_id')` etc. |

Example (one call, structured):
```jinja
{% set ns = namespace(r=[]) %}{% for a in areas() %}{% set ns.r = ns.r + [{"id":a,"name":area_name(a),"entities":area_entities(a)}] %}{% endfor %}{{ ns.r | tojson }}
```
Caveat: `area_entities()` includes entities via device membership. But WS registry lists are far cheaper and don't need admin.

---

## 3. WebSocket API (`ws(s)://<host>/api/websocket`)

([WS docs](https://developers.home-assistant.io/docs/api/websocket/))

### 3.1 Handshake
```
S→C {"type":"auth_required","ha_version":"2026.x.y"}
C→S {"type":"auth","access_token":"<LLAT>"}
S→C {"type":"auth_ok","ha_version":"2026.x.y"}     // or {"type":"auth_invalid","message":"Invalid access token or password"} then close
C→S {"id":1,"type":"supported_features","features":{"coalesce_messages":1}}   // optional, must be first message, id 1
```
(handshake from [WS docs](https://developers.home-assistant.io/docs/api/websocket/); `ha_version` use + supported_features send in [jsws socket.ts](https://raw.githubusercontent.com/home-assistant/home-assistant-js-websocket/master/lib/socket.ts); `auth_invalid` message text not re-verified.)

After auth, every command **must** carry an integer `id` that is strictly increasing per connection (reuse → `id_reuse` error; consts in [core websocket_api/const.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/websocket_api/const.py)). The JS lib uses incrementing ids starting at 2 after the features message.

Result envelope:
```json
{"id":5,"type":"result","success":true,"result":<any>}
{"id":5,"type":"result","success":false,"error":{"code":"not_found","message":"…"}}
```
Event envelope: `{"id":<subscription id>,"type":"event","event":<payload>}`. Error codes in const.py: `id_reuse, invalid_format, not_allowed, not_found, unknown_error, home_assistant_error, service_validation_error, unauthorized, …`.

Coalescing: with `coalesce_messages`, the server may send a single frame containing a JSON **array** of messages ([commands.py `set_supported_features` → `can_coalesce`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/websocket_api/connection.py); WS docs "coalesce_messages: messages sent coalesced in bulk"). A client that does not opt-in gets one message per frame. A Node client opting in must handle `Array.isArray(JSON.parse(data))`.

Backpressure: server `MAX_PENDING_MSG = 4096` per connection queue; a client that doesn't read fast enough gets disconnected ([const.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/websocket_api/const.py)). Max incoming message size constant not found in this pass **(unverified)**.

Keepalive: `{"id":n,"type":"ping"}` → `{"id":n,"type":"pong"}` ([WS docs](https://developers.home-assistant.io/docs/api/websocket/); [commands.py `handle_ping`/`pong_message`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/websocket_api/commands.py)). The JS lib exposes `connection.ping()` and uses it when resuming.

Unsubscribe: `{"id":n,"type":"unsubscribe_events","subscription":<original id>}` works for any subscription type ([WS docs](https://developers.home-assistant.io/docs/api/websocket/)).

### 3.2 Core commands (non-admin unless noted) — [commands.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/websocket_api/commands.py)

| `type` | Request | Result |
|---|---|---|
| `get_states` | – | `State[]` (full, allowed-by-policy) |
| `get_config` | – | config dict (§1.2; `external_url` stripped for local-only users) |
| `get_services` | – | `{domain:{service:{name,description,fields,target?,response?}}}` |
| `call_service` | `{domain, service, service_data?, target?:{entity_id?,device_id?,area_id?,floor_id?,label_id?}, return_response?: bool(default false)}` | `{"context":{id,parent_id,user_id}, "response"?: {...}}` — `response` only when `return_response` true |
| `subscribe_events` | `{event_type?}` | result null, then `event` messages (`{event_type,data,origin,time_fired,context}`) |
| `subscribe_entities` | `{entity_ids?: string[], include?/exclude?: {domains,entities,entity_globs}}` | result null, then compressed events (§3.4) |
| `subscribe_trigger` | admin; `{trigger}` | events |
| `render_template` | `{template, entity_ids?, variables?, timeout?: float, strict?: bool, report_errors?: bool}` | result null, then events `{result:<rendered, parsed>, listeners:{all,domains,entities,time}}` and optionally `{error, level}` when `report_errors` |
| `manifest/list` | `{integrations?: string[]}` | integration manifests (non-admin) |
| `ping` | – | `pong` |
| `validate_config` | `{trigger?,condition?,action?}` | per-key `{valid, error}` |
| `supported_features` | `{features:{coalesce_messages:1}}` | null |
| `fire_event` | admin | |
| `execute_script` | admin | |
| `entity/source` | `{entity_ids?}` | map entity→`{domain}` (non-admin) |
| `auth/current_user` | – | `{id,name,is_owner,is_admin,credentials:[],mfa_modules:[]}` (from [jsws messages.ts `user()`](https://raw.githubusercontent.com/home-assistant/home-assistant-js-websocket/master/lib/messages.ts); response shape not re-verified) — **useful to test whether the token is admin** |

`render_template` source: params verified in [commands.py `handle_render_template`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/websocket_api/commands.py); event payload shape from WS docs (not re-fetched).

### 3.3 Registries — **non-admin readable**

| `type` | Entry fields |
|---|---|
| `config/area_registry/list` | `[{aliases:[], area_id, floor_id, humidity_entity_id, icon, labels:[], name, picture, temperature_entity_id, created_at, modified_at}]` ([core helpers/area_registry.py `json_fragment`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/helpers/area_registry.py)) |
| `config/floor_registry/list` | `[{aliases, created_at, floor_id, icon, level, name, modified_at}]` ([floor_registry.py `_entry_dict`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/config/floor_registry.py)) |
| `config/label_registry/list` | `[{color, created_at, description, icon, label_id, name, modified_at}]` ([label_registry.py `_entry_dict`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/config/label_registry.py)) |
| `config/device_registry/list` | `[{area_id, configuration_url, config_entries:[…], config_entries_subentries, config_entry_id, config_subentry_id, connections:[[k,v]], created_at, disabled_by, entry_type, hw_version, id, identifiers:[[d,i]], labels:[], manufacturer, model, model_id, modified_at, name_by_user, name, …, via_device_id, serial_number, sw_version …}]` ([helpers/device_registry.py `dict_repr`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/helpers/device_registry.py); tail of the field list truncated in my read — fields after `name` unverified). `config_entries` is deprecated (removal planned 2027.8 per source comment). Also `config/device_registry/list_linked_devices`, `list_composite_splits`. |
| `config/entity_registry/list` | full entries (`as_partial_dict`): `{area_id, categories, config_entry_id, config_subentry_id, created_at, device_id, disabled_by, entity_category, entity_id, hidden_by, icon, id, labels:[], modified_at, name, next_name_part, options, original_name, platform, translation_key, unique_id}` ([helpers/entity_registry.py `as_partial_dict`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/helpers/entity_registry.py)) |
| `config/entity_registry/list_for_display` | `{"entity_categories":{...}, "entities":[compressed]}`; disabled entities excluded ([entity_registry.py ws](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/config/entity_registry.py)) |

**`list_for_display` compressed entity keys** (only present when not null) ([helpers/entity_registry.py `_as_display_dict`, `DISPLAY_DICT_OPTIONAL`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/helpers/entity_registry.py)):

| Key | Meaning |
|---|---|
| `ei` | entity_id (always) |
| `pl` | platform/integration (always) |
| `ai` | area_id |
| `lb` | labels (string[]) |
| `di` | device_id |
| `np` | next_name_part |
| `ic` | icon |
| `tk` | translation_key |
| `ec` | entity_category as **index** into `entity_categories` map of the result (index into `EntityCategory` enum: config, diagnostic order per `ENTITY_CATEGORY_VALUE_TO_INDEX`) |
| `hb` | `true` if hidden_by set |
| `en` | entity name |
| `dp` | sensor display precision (sensors only) |

Update notifications: registries fire bus events `entity_registry_updated`, `device_registry_updated`, `area_registry_updated`, `floor_registry_updated`, `label_registry_updated` — subscribe via `subscribe_events` with that `event_type` to refresh caches (event names from HA core convention; not re-verified in this pass).

Area for an entity (frontend logic): `entity.area_id ?? device(entity.device_id).area_id`. Hidden entities: `hidden_by` set (`hb:true` in display). Disabled entities don't appear in `list_for_display` and have no state.

### 3.4 `subscribe_entities` compressed format
Request: `{"id":N,"type":"subscribe_entities","entity_ids":["a.b"]?}`. Server first sends `{"id":N,"type":"result","success":true,"result":null}`, then a first event with `{"a":{...}}` containing all states ([commands.py `handle_subscribe_entities`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/websocket_api/commands.py)). Parse shape from [jsws states.ts](https://raw.githubusercontent.com/home-assistant/home-assistant-js-websocket/master/lib/states.ts):

```ts
interface EntityState { s: string; a: Record<string,any>; c: Context|string; lc: number; lu: number }   // epoch seconds
interface EntityDiff  { "+"?: Partial<EntityState>; "-"?: { a: string[] } }
interface StatesUpdates { a?: Record<entity_id, EntityState>; r?: string[]; c: Record<entity_id, EntityDiff> }
```
Event payload per message: `{"a":{...}}` (adds / initial), `{"r":["id",...]}` (removed), `{"c":{"id":{"+":{"s":"on","a":{"brightness":10},"lc":1730000000.1,"lu":…,"c":"ctxid"},"-":{"a":["removed_attr"]}}}}`.
Reconstruction rules (jsws):
- `a`: `state = s`, `attributes = a`, `last_changed = lc*1000`, `last_updated = lu ? lu*1000 : last_changed`, `context = typeof c === "string" ? {id:c,parent_id:null,user_id:null} : c`.
- `c` diff: `+.s` replaces state; `+.c` string → merges `{id}` into context, object → shallow-merge; `+.lc` sets both `last_changed` and `last_updated`, else `+.lu` sets `last_updated`; `+.a` shallow-**merges** into attributes (`Object.assign`); `-.a` deletes keys; diff for an unknown entity is ignored (warn).
- On reconnect/resubscribe, the first message must **replace** the full state map (library marks `replace=true` on `ready`), since removals while disconnected are not reported.
- Events may arrive coalesced as one array.

### 3.5 History / logbook / statistics / energy

| `type` | Request | Notes |
|---|---|---|
| `history/history_during_period` | `{start_time, end_time?, entity_ids: string[] (required), include_start_time_state?=true, significant_changes_only?=true, minimal_response?=false, no_attributes?=false}` | returns `{entity_id: [state...]}` using compressed state keys (`s`,`a`,`lu`,`lc`) — shape per history/websocket_api.py (not fully re-read **(unverified)**) |
| `history/stream` | same params | initial result + events `{states:{entity_id:[{s,a,lu,lc}]}, start_time, end_time?}`; stream continues until `end_time` or unsubscribe |
| `logbook/event_stream` | `{start_time, end_time?, entity_ids?, device_ids?}` | initial `{events:[…], start_time, end_time}` then updates; `logbook/get_events` also takes `context_id` ; entries use compressed keys (`when,name,message,entity_id,state,domain,context_*`) |
| `recorder/statistics_during_period` | `{start_time, end_time?, statistic_ids: [str] (non-empty), period: "5minute"\|"hour"\|"day"\|"week"\|"month"\|"year", units?: {...}, types?: ["change","last_reset","max","mean","min","state","sum"]}` | returns `{statistic_id: [{start,end,mean?,min?,max?,sum?,state?,change?,last_reset?}]}`; times are epoch **ms** (HA frontend convention; not re-verified) |
| `recorder/statistic_during_period` | single `statistic_id` + `fixed_period`/`calendar`/… | single aggregate |
| `recorder/list_statistic_ids` / `recorder/get_statistics_metadata` | | metadata (unit, has_sum, has_mean, source) |
| `energy/get_prefs` | – | `{energy_sources:[{type:"grid"\|"solar"\|"battery"\|"gas"\|"water", flow_from:[{stat_energy_from, stat_cost, entity_energy_price, number_energy_price, …}], …}], device_consumption:[{stat_consumption, name?, included_in_stat?}], device_consumption_water, device_consumption_gas}`; error `not_found` if energy not configured |
| `energy/info` | – | `{cost_sensors, solar_forecast_domains}` |
| `energy/fossil_energy_consumption` | `{start_time, end_time, energy_statistic_ids, co2_statistic_id, period: "5minute"\|"hour"\|"day"\|"month"}` | map of start→fossil kWh |

Sources: [history/websocket_api.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/history/websocket_api.py), [logbook/websocket_api.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/logbook/websocket_api.py), [recorder/websocket_api.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/recorder/websocket_api.py), [energy/websocket_api.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/energy/websocket_api.py). Request schemas verified; response shapes in the right-hand notes beyond request fields are mostly **unverified** — test against a live instance before coding parsers.
Long-term statistics (energy) are in the recorder; `recorder/*` commands need the recorder integration (default in HA).

### 3.6 Domain WS commands

| `type` | Request | Notes |
|---|---|---|
| `todo/item/list` | `{entity_id}` | `{items:[{uid,summary,status:"needs_action"\|"completed",due?,description?}]}` |
| `todo/item/subscribe` | `{entity_id (todo domain)}` | initial + events with `{items:[…]}` on change ([todo/__init__.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/todo/__init__.py)) |
| `weather/subscribe_forecast` | `{entity_id, forecast_type:"daily"\|"hourly"\|"twice_daily"}` | error `invalid_entity_id` / `forecast_not_supported`; events `{"type": forecast_type, "forecast":[…]\|null}` ([weather/websocket_api.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/weather/websocket_api.py)). Also `weather/convertible_units`. |
| `calendar/event/subscribe` | `{entity_id, start: datetime, end: datetime}` | **exists** ([calendar/__init__.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/calendar/__init__.py)); events with updated event list |
| `camera/stream` | `{entity_id, format?="hls"}` | `{url}` |
| `camera/capabilities` | `{entity_id}` | `{frontend_stream_types:[…]}` |
| `search/related` | `{item_type: "area"\|"device"\|"entity"\|"floor"\|"label"\|"automation"\|"config_entry"\|"group"\|"integration"\|"person"\|"scene"\|"script"..., item_id, include_disabled_entities?=false}` | `{area?:[], device?:[], entity?:[], floor?:[], label?:[], automation?:[], …}` — all sets as arrays ([search/__init__.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/search/__init__.py)). e.g. `item_type:"area", item_id:"kitchen"` → entities+devices in the area incl. via devices. |
| `system_health/info` | – | subscription: result null then events `{type:"initial", data:{domain:{info:{k:v\|{type:"pending"}…}}}}`, then `{type:"update", success, data}` / `{type:"finish"}` ([system_health/__init__.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/system_health/__init__.py); full shape partially verified) |
| `repairs/list_issues` | – | `{issues:[{breaks_in_ha_version, created, dismissed_version, domain, ignored, is_fixable, issue_domain, issue_id, learn_more_url, severity, translation_key, translation_placeholders, active…}]}` ([repairs/websocket_api.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/repairs/websocket_api.py)); field list **(unverified)** |
| `update` entities | no special API | `update.*` entities: state `on` = update available; attributes `installed_version, latest_version, release_url, title, release_summary, in_progress, skipped_version, auto_update`; install via `update.install` service (`{entity_id, version?, backup?}`). `supported_features`: INSTALL=1, SPECIFIC_VERSION=2, PROGRESS=4, BACKUP=8, RELEASE_NOTES=16 **(unverified; entity docs not fetched)** |

---

## 4. Practical guidance for a Node dashboard server

- **Poll vs WS**: WS `subscribe_entities` is what the HA frontend itself uses (the jsws library: "if atLeastHaVersion 2022.4 → `subscribe_entities`" else legacy get_states + state_changed; [jsws states.ts](https://raw.githubusercontent.com/home-assistant/home-assistant-js-websocket/master/lib/states.ts)). It sends a full snapshot once and then small diffs, with server-side filtering (`entity_ids` / include-exclude) so a dashboard that cares about ~50 entities only sees those. `GET /api/states` returns **all** entities each time (each with full attributes, can be MBs on 1–2k-entity installs; gzip enabled over a threshold — [core `APIStatesView`](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/api/__init__.py)). Exact payload sizes / documented rate limits: **none found in primary sources** (no rate limit in the REST view code; HA doesn't document one).
- **Practical design**: one long-lived WS per integration instance (shared across widgets), keyed by base URL+token; subscribe with the union of entity_ids needed; fetch `config/area_registry/list`, `floor_registry/list`, `label_registry/list`, `device_registry/list`, `entity_registry/list_for_display` once per (re)connect (+ subscribe to `*_registry_updated` events or refetch on a timer). REST remains right for: one-shot widgets, history (`/api/history/period`), calendars, camera images, service calls from tRPC mutations (or WS `call_service`).
- **Reconnect logic** (jsws behaviour — [socket.ts](https://raw.githubusercontent.com/home-assistant/home-assistant-js-websocket/master/lib/socket.ts)): connect timeout 10 s (`DEFAULT_CONNECT_TIMEOUT`); retry every 1 s (`setTimeout(connect, 1000)`) until auth; do **not** retry on `auth_invalid`; after reconnect, re-send all subscriptions and replace entity state wholesale (it flips `replace=true` on `ready`). Consider exponential backoff in a Node server.
- **Message ids**: strictly increasing per socket; `supported_features` must be id 1 in the lib's convention.
- **Node**: Node ≥ 22 has a global `WebSocket` (WHATWG) — no `ws` dependency needed unless proxying/custom TLS (custom CA / self-signed certs are not configurable on the global WebSocket; `ws` or undici dispatcher may be needed) **(unverified for undici options)**.
- **`supported_features`**: integer bitmask in `attributes.supported_features` of states; semantic per domain (`LightEntityFeature`, `MediaPlayerEntityFeature`, `ClimateEntityFeature`, `WeatherEntityFeature` (FORECAST_DAILY/HOURLY/TWICE_DAILY — see §5), `CameraEntityFeature` (ON_OFF=1, STREAM=2), `CalendarEntityFeature`, `TodoListEntityFeature`, …). Services declare `target.entity.supported_features` in services.yaml to filter. Not to be confused with the WS command `supported_features {features:{coalesce_messages:1}}` (connection-level, [commands.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/websocket_api/commands.py)).
- **Area resolution**: build `deviceAreaById` from `device_registry/list`; for each `list_for_display` entity: `areaId = ai ?? deviceAreaById[di]`; `floorId = area.floor_id`. Skip entities with `hb` (hidden) and consider entity_category (`ec`) to hide diagnostic/config entities (frontend does).
- **Admin vs non-admin tokens**: recommend using a non-admin user's LLAT where possible; everything the dashboard needs is non-admin except REST templates, `error_log`, `subscribe_trigger`. Use WS `auth/current_user` to detect admin.
- **Unit system**: `config.unit_system` tells HA's configured units; sensor states are already in the configured/display units.
- **Timestamps**: REST states use ISO-8601 strings with offset; compressed WS uses epoch seconds float.

---

## 5. Services that return data (REST `?return_response`, WS `call_service return_response:true`)

All three are `SupportsResponse.ONLY` ⇒ REST **requires** `?return_response`, and WS **requires** `return_response:true` (otherwise validation error). Entity targeting uses the normal service data (`entity_id`, or `target` in WS). Response is **keyed by entity_id** (shown in REST docs sample). Sources: [weather/services.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/weather/services.py), [todo/services.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/todo/services.py), [calendar/services.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/calendar/services.py), [REST docs](https://developers.home-assistant.io/docs/api/rest/).

> Note: only `calendar.get_events` and `todo.get_items` SupportsResponse.ONLY were verified directly in code (`supports_response=SupportsResponse.ONLY` lines); `weather.get_forecasts` registration truncated at `supports_response=SupportsRespons…` (clearly ONLY/OPTIONAL-style; the REST docs' own example uses it with `return_response`, treat as ONLY).

### 5.1 `weather.get_forecasts`
```
POST /api/services/weather/get_forecasts?return_response
{"entity_id":"weather.home","type":"daily"}     // type ∈ daily | hourly | twice_daily
→ {"changed_states":[], "service_response":{"weather.home":{"forecast":[
   {"datetime":"2026-11-07T00:00:00+00:00","condition":"rainy","temperature":16.0,"templow":4.0,"precipitation":1.2,"precipitation_probability":60,"wind_speed":..,"wind_bearing":..,"humidity":..,"is_daytime"?: bool (twice_daily only),"apparent_temperature"?,"cloud_coverage"?,"uv_index"?,"pressure"?,"dew_point"?,"wind_gust_speed"?}]}}}
```
- Required `type`; if entity lacks the feature → HomeAssistantError (500) ("unsupported_forecast_type"); `forecast` is `[]` if the integration returned None. Feature check via `WeatherEntityFeature.FORECAST_DAILY|HOURLY|TWICE_DAILY` bits on `attributes.supported_features` (weather: FORECAST_DAILY=1, FORECAST_HOURLY=2, FORECAST_TWICE_DAILY=4 — **bit values unverified**). Units are converted to the user's configured units (`_convert_forecast`).
- Alternative live: WS `weather/subscribe_forecast`.

### 5.2 `todo.get_items`
```
POST /api/services/todo/get_items?return_response
{"entity_id":"todo.shopping_list","status":["needs_action","completed"]}   // status optional (multi); service default doc'd as needs_action in services.yaml
→ {"service_response":{"todo.shopping_list":{"items":[{"summary":"Milk","uid":"…","status":"needs_action","due":"2026-11-10","description":"…"}]}}}
```
- Item dict built with `api_items_factory`: drops `None` values, dates/datetimes → ISO strings, everything else `str()` (so `status` is the enum value string) ([core todo/__init__.py / const](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/todo/__init__.py)). Fields: `summary`, `uid`, `status`, `due`, `description`. With no `status` filter the code returns **all** items (filter applied only `if statuses`), though services.yaml documents a UI default of `needs_action`.
- Other todo services (no response): `add_item`, `update_item`, `remove_item`, `remove_completed_items`.

### 5.3 `calendar.get_events`
```
POST /api/services/calendar/get_events?return_response
{"entity_id":"calendar.family","start_date_time":"2026-11-06 00:00:00","duration":{"hours":24}}
   // or "end_date_time":"…"; one of duration/end_date_time required; start defaults to now
→ {"service_response":{"calendar.family":{"events":[{"start":"2026-11-06T10:00:00+01:00","end":"…","summary":"…","description":"…","location":"…","uid":"…","rrule":"…","recurrence_id":"…"}]}}}
```
- Format differs from REST `/api/calendars/<id>`: this uses `list_events_dict_factory` → **plain strings** (no `{dateTime}` / `{date}` wrappers), only fields in `LIST_EVENT_FIELDS`, `None` values omitted; all-day events give date-only strings (`"2026-11-06"`) (inference from `event_dict_factory` — **format details unverified**). ([calendar/helper.py](https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/calendar/helper.py), services.py)
- Default `start` = `dt_util.now()`.
- For many calendars, `GET /api/calendars/<id>?start=&end=` per calendar is the alternative (§2.6); both return events overlapping the window.

---

## 6. Gaps to verify against a live HA before finalizing
- Exact REST logbook params/response (source not found in this pass).
- Response shapes of `history/history_during_period`, `history/stream`, `logbook/event_stream`, `recorder/statistics_during_period`, `repairs/list_issues`, `system_health/info`.
- Whether registry-updated event names (`*_registry_updated`) are exactly as listed.
- `units.as_dict()` complete key list, `LIST_EVENT_FIELDS`, weather/update feature bit values.
- Max WS message size / ping interval enforced by server (aiohttp heartbeat) — constants not located.
