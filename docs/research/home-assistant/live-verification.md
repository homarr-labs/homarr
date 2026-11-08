# Home Assistant live verification

Verified against a throwaway container: HA Core **2026.11.0** (`config.version`), `demo:` platform, `time_zone: Europe/Zurich`, admin (owner) long-lived token, 2026-11-06. Scripts: `/tmp/ha-rework/verify/`. All excerpts are trimmed real responses; IDs/tokens shortened. Complements `api.md` / `domains.md` (does not repeat source-confirmed facts).

## Key findings

1. **`subscribe_entities` result is `null`; the first event is `{"a":{...}}` only** (no `c`/`r`). Diffs follow as `{"c":{id:{"+":{...},"-":{...}}}}`, removals as `{"r":[ids]}`. An `entity_ids` filter works; **non-existent ids are silently omitted** (no error). The initial event for a filter with only unknown ids is `{"a":{}}`.
2. **`entity_ids: []` means "all entities"** (it subscribed to everything, not nothing), and a bare string `entity_ids:"light.x"` is **accepted** (coerced to a list). Don't rely on either; always send a non-empty array.
3. **Context in compressed states is polymorphic**: `"c"` is a plain context-id **string** when the context has no user/parent, and an object `{id,parent_id,user_id}` otherwise (initial `a` payload and diffs both). Parser must accept both. Timestamps (`lc`, `lu`) are epoch **seconds (float)**; `lu` is omitted when equal to `lc`, and diffs carry `lc` (state change) or `lu` (attribute-only change).
4. **Attribute diffs**: `+.a` is a shallow merge; *attributes removed in the same update appear in `"-":{"a":["key"]}`*. Light turning off does **not** remove keys; it sets them to `null` (`"brightness":null`) – so treat `null` as "absent" for light.
5. **`unsubscribe_events {subscription:<id>}`** works for `subscribe_entities`, `history/stream`, `logbook/event_stream`, `render_template`; returns `{"success":true,"result":null}`; no more events afterwards.
6. **Sparklines: use WS `history/history_during_period` with `minimal_response:true, no_attributes:true`** (or `history/stream` for live append). Result is `{entity_id:[{s,lu}...]}` with only the first item carrying `a` when `no_attributes:false`. REST `/api/history/period` has full ISO objects and **returns a list of lists**; the first entry per entity is a full state, the rest `{state,last_changed}` only. History is raw state changes (not bucketed) and contains `"unavailable"`/`"unknown"` strings that must be filtered. For long ranges prefer `recorder/statistics_during_period` (5minute/hour buckets with `mean/min/max`).
7. **Statistics**: `recorder/statistics_during_period` requires `statistic_ids` (no "all") and returns `{id:[{start,end,mean,min,max,state,sum,change,last_reset}]}` with **epoch-millisecond** `start/end`. Only entities with `state_class` appear in `recorder/list_statistic_ids`; REST-injected virtual states did **not**. `period:"hour"` returned `{}` until the first hourly compile (unverified with data, see §3).
8. **REST service errors are mostly opaque**: schema/validation failures return **`400` `text/plain` body `400: Bad Request`** (bad value, missing field, unknown service, unknown domain). Only runtime errors give JSON `{"message":"..."}`. **WS `call_service` returns structured errors** (`invalid_format`, `not_found`, `service_validation_error` + `translation_key`). Prefer WS for actions when error messages matter.
9. **Unknown entity or wrong-domain entity in `entity_id` is a silent no-op: `200 []`**. Never infer success from a 200; check `changed_states` or follow up on the subscription. `[]` also returned when the call changed nothing (e.g. `climate.set_temperature` to the current value, `automation.trigger`).
10. **`?return_response` is mandatory for `weather.get_forecasts`, `calendar.get_events`, `todo.get_items`** (400 JSON message without it) and **forbidden for normal services** (400 `Service does not support responses...`). Response shape `{"changed_states":[],"service_response":{<entity_id>:{...}}}`. Multiple `entity_id`s are keyed individually. Missing required `type` → opaque `400: Bad Request`; unknown entity → **500** `{"message":"Service call requested response data but did not match any entities"}`.
11. **Weather forecast support is per entity**: south = `supported_features:1` (daily only), north = `7`. Unsupported type → `400 {"message":"Weather entity ... does not support the hourly forecast type"}`. Forecast datetimes are ISO strings in the **HA time zone with offset** (`+01:00`). Weather states have **no `forecast` attribute**.
12. **Media-player `entity_picture` carries `?token=<hex>&cache=<hash>`** and works **without `Authorization`** (`200 image/jpeg`, `Cache-Control: max-age=3600`); missing/bad token → `403` unless the Bearer header is sent. Token stable across state changes. **Camera** `entity_picture` has `?token=` (the `access_token` attribute) and without it or the header → `403`; with the Bearer header `200 image/jpg` (jpeg) or `image/png`. Camera proxy supports `?width=&height=`. `camera_proxy_stream` hangs (MJPEG stream, never completes).
13. **Entity→area**: `list_for_display` entities carry `ai` (entity-own area) only when set; otherwise take `device_registry/list[].area_id` via `di`. Effective area = `ai ?? devices[di].area_id`. An entity without its own name cannot have its own area (HA rejects with `invalid_info`). In the pristine demo **no entity or device has an area** (3 areas exist, none assigned). `person.*` have **no `entity_picture` in states** (nor in the registry display list).
14. **`get_services` has no `name`/`description`** in this version (just `fields` + `target` + optional `response`); fields have `selector`, `filter`, `required`, `default`, `example`, nested groups (`additional_fields.fields`, `temperature_range.fields`). Good for building a typed allowlist but not for labels.
15. **Auth failures**: REST bad/missing token → `401` `text/plain` `401: Unauthorized`. WS: `auth_required` → `auth_invalid {"message":"Invalid access token or password"}` then the server closes with code 1000. A non-auth message first → `auth_invalid` ("Auth message incorrectly formatted…"), also closed.
16. `render_template` WS result is **typed** (`15.6` number, not `"15.6"`), and each event includes `listeners`; REST `/api/template` returns `text/plain`.

## 1. `subscribe_entities`

Request / result:
```json
{"id":1,"type":"subscribe_entities"}
{"id":1,"type":"result","success":true,"result":null}
```
First event (unfiltered: 135 entities in `a`):
```json
{"id":1,"type":"event","event":{"a":{
 "light.ceiling_lights":{"s":"on","a":{"min_color_temp_kelvin":2000,"max_color_temp_kelvin":6535,"supported_color_modes":["color_temp","hs"],"color_mode":"color_temp","brightness":180,"color_temp_kelvin":2631,"hs_color":[28.55,67.974],"rgb_color":[255,164,82],"xy_color":[0.532,0.388],"friendly_name":"Ceiling Lights","supported_features":0},"c":"01M6RQFS8BCJXAAHKNCN8NSR17","lc":1793978787.0830731},
 "person.test":{"s":"unknown","a":{"editable":true,"id":"test","device_trackers":[],"in_zones":[],"user_id":"c962…","friendly_name":"test"},"c":"01M6…","lc":1793978786.8688314}}}}
```
Change (`light.toggle` from REST by a user → `c` is object in the diff):
```json
{"id":1,"type":"event","event":{"c":{"light.ceiling_lights":{"+":{"s":"off","lc":1793978962.81,"c":{"user_id":"c962…","id":"01M6RQN4VTFXXX6C03XJNKVPD4"},"a":{"color_mode":null,"brightness":null,"color_temp_kelvin":null,"hs_color":null,"rgb_color":null,"xy_color":null}}}}}}
```
Subsequent: `"c":"01M6…"` (string) when no user. Attribute-only change (brightness 255→153): `{"+":{"s":"on","lc":…,"c":"…","a":{"brightness":153,…}}}` (state was same-string but change had `s`; pure attr changes on other entities send only `lu`).

Removal / attribute-removal diffs (virtual entity via `POST /api/states/sensor.zz_test`):
```json
{"c":{"sensor.zz_test":{"+":{"s":"2","lc":1793978968.47,"c":"01M6…"},"-":{"a":["b"]}}}}   // attrs {a,b} -> {a}
{"c":{"sensor.zz_test":{"+":{"lu":1793978968.78,"c":"01M6…","a":{"c":[1]}}}}}              // attr-only add, state unchanged
{"r":["sensor.zz_test"]}                                                                     // DELETE /api/states/...
```
Filtered:
```json
{"id":3,"type":"subscribe_entities","entity_ids":["light.ceiling_lights","sensor.outside_temperature","light.nonexistent"]}
→ result null; first event "a" contains only the two existing entities.
```
Changes to other entities (light.kitchen_lights toggled) are **not** delivered; ceiling_lights ones are.

Edge cases: `entity_ids:[]` → success, behaves like unfiltered (received `zz_test` events). `entity_ids:"light.x"` → success (string accepted). Filter with only non-existing id → first event `{"a":{}}`.
Unsubscribe: `{"id":2,"type":"unsubscribe_events","subscription":1}` → `{"id":2,"type":"result","success":true,"result":null}`; toggling afterwards produced 0 events.

## 2. History

WS request (24h window, both entities):
```json
{"type":"history/history_during_period","start_time":"2026-11-05T15:29:49.869Z","end_time":"2026-11-06T15:29:49.869Z","entity_ids":["sensor.outside_temperature","light.ceiling_lights"],"minimal_response":true,"no_attributes":true}
```
Shapes (`lu` = epoch seconds float; `lc` appears only when `lc != lu`, i.e. attribute-only updates):
```jsonc
// default (full attrs repeated on every item)
{"sensor.outside_temperature":[{"s":"15.6","a":{"state_class":"measurement","unit_of_measurement":"°C","device_class":"temperature","friendly_name":"Outside Temperature"},"lu":1793978787.085}], "light.ceiling_lights":[{"s":"on","a":{"friendly_name":"Ceiling Lights"},"lu":…},{"s":"off","a":{…},"lu":…}]}
// minimal_response:true  (attrs only on first item per entity; others {"s","lu"})
"light.ceiling_lights":[{"s":"on","a":{"friendly_name":"Ceiling Lights"},"lu":…},{"s":"off","lu":…},…]
// no_attributes:true      -> "a":{} on every item
// minimal_response + no_attributes -> only {"s","lu"} (first item too). Smallest.
```
- History attrs are the *recorder-filtered* subset (light history shows only `friendly_name`).
- `significant_changes_only` true vs false: identical for the test sensor (attribute-only change `15→15 foo:attrchange` was dropped with `no_attributes`; with `minimal_response:false,no_attributes:false` it appears as `{"s":"15","a":{…foo…},"lu":…,"lc":<earlier>}`). Unavailable appears as an item: `{"s":"unavailable","lu":…}`.
- `include_start_time_state:false`: same output here (no state older than window to include).
- Errors: missing `entity_ids` → `{"success":false,"error":{"code":"invalid_format","message":"required key not provided at 'entity_ids'. Got None"}}`; bad `start_time` → `code:"invalid_start_time"`; unknown entity → `result:{}` (key absent).

REST: `GET /api/history/period/<start>?filter_entity_id=a,b&end_time=<iso>&minimal_response&no_attributes[&significant_changes_only=0]` → `200`, **list of lists**, one inner list per entity that has data:
```json
[[{"entity_id":"sensor.outside_temperature","state":"15.6","attributes":{},"last_changed":"2026-11-06T15:26:27.085227+00:00","last_updated":"…"}],
 [{"entity_id":"light.ceiling_lights","state":"on","attributes":{},"last_changed":"…","last_updated":"…"},{"state":"off","last_changed":"2026-11-06T15:29:22.812042+00:00"},{"state":"on","last_changed":"…"}]]
```
Quirks: with `minimal_response` the first entry keeps `entity_id`/`attributes`, later ones only `state` + `last_changed` (no `last_updated`). Without `filter_entity_id` the response was 41 bytes (`[]`-like; HA returns little/none for unfiltered with no end) – always filter. Unknown entity → `200 []`; bad timestamp → `400 {"message":"Invalid datetime"}`. REST sizes (2 entities): full 2087 B, minimal+noattr 869 B.

**Recommendation for 24h sparklines**: WS `history/history_during_period` minimal+no_attributes (compact, epoch floats, one round trip, auth already on the socket). Filter `s` to numeric (drop `unavailable`/`unknown`), prepend value at `start`, step-hold to bucket client-side. For multiple tiles batch all `entity_ids` in one call. For >7 days use statistics instead.

`history/stream` (supported):
```json
{"id":9,"type":"history/stream","start_time":"…","end_time":"…","entity_ids":["sensor.outside_temperature","light.ceiling_lights"],"minimal_response":true,"no_attributes":true}
→ {"id":9,"type":"result","success":true,"result":null}
→ {"id":9,"type":"event","event":{"states":{"sensor.outside_temperature":[{"s":"15.6","lu":1793978787.085}],"light.ceiling_lights":[{"s":"on","lu":…},…]},"start_time":1793892589.869,"end_time":1793978967.862385}}
```
Without `end_time` (live): initial event identical (includes `start_time`/`end_time`), then incremental events as state changes:
```json
{"id":10,"type":"event","event":{"states":{"light.ceiling_lights":[{"s":"off","lu":1793978991.2336469}]}}}
```
(Our live toggle was delivered ~immediately; no explicit end marker seen for the closed-window case.)

## 3. Statistics

`recorder/list_statistic_ids` (all, 12 ids in demo; only `state_class` sensors):
```json
{"statistic_id":"sensor.outside_temperature","display_unit_of_measurement":"°C","has_mean":true,"mean_type":1,"has_sum":false,"name":null,"source":"recorder","statistics_unit_of_measurement":"°C","unit_class":"temperature"}
{"statistic_id":"sensor.total_energy_kwh","display_unit_of_measurement":"kWh","has_mean":false,"mean_type":0,"has_sum":true,…,"unit_class":"energy"}
```
`{"statistic_type":"sum"}` filters to total/total_increasing. `recorder/get_statistics_metadata {statistic_ids:[…]}` returns the same objects (array). `mean_type` 0/1 (0 none, 1 arithmetic).

`recorder/statistics_during_period` (`start_time`, `end_time?`, `statistic_ids` **required**, `period` ∈ `5minute|hour|day|week|month|year`, `types?`, `units?`):
```json
{"type":"recorder/statistics_during_period","start_time":"…","statistic_ids":["sensor.outside_temperature","sensor.total_energy_kwh"],"period":"5minute","types":["mean","min","max","state","sum","last_reset","change"]}
→ {"result":{
 "sensor.outside_temperature":[{"start":1793978700000,"end":1793979000000,"state":null,"last_reset":null,"sum":null,"mean":15.6,"max":15.6,"min":15.6,"change":null}],
 "sensor.total_energy_kwh":[{"start":1793978700000,"end":1793979000000,"state":0,"last_reset":null,"sum":0,"mean":null,"max":null,"min":null,"change":0}]}}
```
`start`/`end` are epoch **ms**. Fields not in the requested `types` are omitted (not verified in this run; default returned all). Errors: missing `statistic_ids` → `invalid_format … required key not provided at 'statistic_ids'`; bad period → `expected '5minute' or 'hour' or 'day' or 'week' or 'month' or 'year' at 'period'`; unknown id → `result:{}`.
**Not verified**: `hour`/`day`/`week`/`month` with data (container started 15:26 UTC; first hourly compile at 16:00; returned `{}` at 15:33), `units` conversion output (returned `{}` for same reason), `recorder/statistics_during_period` for virtual entities (no output). `recorder/info` → `{"backlog":0,"recording":true,"thread_running":true,…}`.

## 4. Logbook

`logbook/get_events {start_time,end_time?,entity_ids?}` (`start_time` required, else `invalid_format`). Entries (epoch seconds `when`; keys omitted when null):
```json
{"state":"off","entity_id":"light.ceiling_lights","when":1793978962.8120422,"context_user_id":"c962…","context_domain":"light","context_service":"toggle","context_event_type":"call_service"}
{"name":"Home Assistant","message":"started","icon":"mdi:home-assistant","domain":"homeassistant","when":1793978789.61}
{"name":"Notify when garage left open","message":"triggered","source":null,"entity_id":"automation.notify_when_garage_left_open","context_id":"01M6…","item_id":"1700000000002","run_id":"750e…","domain":"automation","when":1793979026.65,"context_user_id":"c962…"}
{"name":"Good morning","message":"started","entity_id":"script.good_morning","context_id":"…","item_id":"good_morning","run_id":"…","domain":"script","when":…,…}
```
Notes: state entries have **no `name`** in WS (REST adds `"name":"Ceiling Lights"` and ISO `when`). No `entity_ids` → all entries (15 in the window). Automation/script events are distinguished by `message`/`domain`. `entity_ids` filter with no matching rows → `[]`. Logbook recorder commit delay: needed ~5 s after the action before rows were visible.
`logbook/event_stream {start_time,entity_ids}` → result `null`; first event `{"events":[…]}` (history), then live `{"events":[{…one entry…}]}` (delivered within 1.5 s). Unsubscribe via `unsubscribe_events`.
REST `GET /api/logbook/<start>?entity=light.ceiling_lights&end_time=…` → 200 list with ISO `when` and `name`.

## 5. Service calls (REST)

Success: `200 application/json` **list of changed states**, full state objects (`entity_id,state,attributes,last_changed,last_reported,last_updated,context{id,parent_id,user_id}`). Services with transitional states return several (e.g. `lock.unlock` → `unlocking` then `unlocked`; `scene.turn_on` returns scene + affected light).

| Call | Status | Body excerpt |
|---|---|---|
| `light/turn_on {entity_id:"light.bed_light",brightness_pct:40}` | 200 | `[{"entity_id":"light.bed_light","state":"on","attributes":{"brightness":102,…}}]` |
| `climate/set_temperature {entity_id:"climate.hvac",temperature:21}` | 200 | `[]` when value unchanged; else state list |
| `climate/set_temperature {entity_id:"climate.ecobee",target_temp_low:19,target_temp_high:24}` | 200 | state with `target_temp_low/high` |
| `media_player/media_play_pause` | 200 | `state:"paused"` (+ `entity_picture`, `media_position`) |
| `cover/set_cover_position {position:50}` | 200 | `state:"closing"`, `current_position:70` (transitional) |
| `lock/unlock` | 200 | `[{state:"unlocking"},{state:"unlocked"}]` |
| `scene/turn_on` | 200 | scene state = timestamp, + changed lights |
| `script/turn_on` | 200 | `state:"on"`, `attributes.current:1` (returns immediately) |
| `automation/trigger` | 200 | `[]` (state unchanged) |
| `button/press` | 200 | state = ISO timestamp |
| `input_number/set_value {value:55}` | 200 | `state:"55.0"` |
| `input_select/select_option {option:"Away"}` | 200 | `state:"Away"` |
| `vacuum/start` | 200 | `state:"cleaning"` |
| `fan/set_percentage {percentage:50}` | 200 | `state:"on","percentage":50` |
| `alarm_control_panel/alarm_arm_away` (no code) | **400** | `{"message":"Arming requires a code but none was given for alarm_control_panel.security"}` |
| same with `code:"1234"` | 200 | `state:"arming"`, `next_state:"armed_away"` |
| `alarm_disarm code:"0000"` (wrong) | **400** | `{"message":"invalid_code"}` (demo valid code `1234`) |

Errors:
| Case | Status | Body |
|---|---|---|
| Unknown service `fan/nope` | 400 | `400: Bad Request` (text/plain) |
| Unknown domain `nodomain/turn_on` | 400 | `400: Bad Request` (text/plain) |
| Unknown entity `light.does_not_exist` | **200** | `[]` |
| Entity of wrong domain `switch.ac` for `light.turn_on` | **200** | `[]` |
| No `entity_id` (`light/turn_on {}`) | 400 | `400: Bad Request` |
| `brightness_pct:500` / `"abc"` | 400 | `400: Bad Request` |
| Unknown field `bogus_field` | 400 | `400: Bad Request` |
| `climate/set_temperature` missing temp | 400 | `400: Bad Request` |
| `temperature:999` | 400 | `{"message":"Provided temperature 999.0 is not valid. Accepted range is 7 to 35"}` |
| `input_select option:"Nope"` | 400 | `{"message":"Option Nope is not valid for input_select.house_mode. Valid options are: Home, Away, Night, Party"}` |
| `input_number value:9999` | 400 | `400: Bad Request` |
| Unsupported feature `cover/set_cover_position` on `cover.garage_door` | 400 | `{"message":"Entity cover.garage_door does not support action cover.set_cover_position"}` |
| Malformed JSON | 400 | `{"message":"Data should be valid JSON."}` |
| No body | 400 | `400: Bad Request` |
| `?return_response` on normal service | 400 | `{"message":"Service does not support responses. Remove return_response from request."}` |
| `entity_id:"all"` | 200 | affects all lights |
| `entity_id` list | 200 | all matched entities' states |

WS `call_service` (same HA, `target:{entity_id}`, `service_data`, `return_response?`). Success `{"result":{"context":{"id","parent_id","user_id"}}}` (+ `"response":{…}` when asked). Errors are structured:
```json
{"code":"not_found","message":"Service light.nope not found.","translation_key":"service_not_found","translation_placeholders":{"domain":"light","service":"nope"}}
{"code":"invalid_format","message":"expected a percentage between 0 and 100 at 'brightness_pct'"}
{"code":"invalid_format","message":"required key not provided at 'value'"}
{"code":"service_validation_error","message":"Validation error: Arming requires a code but none was given for alarm_control_panel.security","translation_key":"code_arm_required"}
{"code":"service_validation_error","message":"Validation error: The action requires responses and must be called with return_response=True","translation_key":"service_lacks_response_request"}
```
Unknown entity over WS → still `success:true` (silent no-op, same as REST).

## 6. `return_response`

```http
POST /api/services/weather/get_forecasts?return_response   {"entity_id":"weather.demo_weather_south","type":"daily"}
→ 200 {"changed_states":[],"service_response":{"weather.demo_weather_south":{"forecast":[
  {"datetime":"2026-11-06T16:00:13.269873+01:00","condition":"rainy","precipitation":1,"temperature":22,"templow":15,"precipitation_probability":60}, … 7 entries]}}}
```
- `type:"twice_daily"` (north) adds `"is_daytime":true|false` per entry; temperatures are in the unit system of `/api/config`/entity (`-23.3` for north in °C).
- `type:"hourly"` on south → `400 {"message":"Weather entity weather.demo_weather_south does not support the hourly forecast type"}`; `hourly` on north (`supported_features:7`) works: 1-hour steps `{"datetime":"2026-11-06T16:00:45.97+01:00","condition":"sunny","precipitation":2,"temperature":-23.3,"templow":-26.1,"precipitation_probability":60}` (hourly entries also carry `templow` in the demo).
- Multiple entities → both keyed in `service_response`.
- Missing flag → `400 {"message":"Service call requires responses but caller did not ask for responses. Add ?return_response to query parameters."}`.
- Missing `type` → `400: Bad Request`; unknown entity → `500 {"message":"Service call requested response data but did not match any entities"}`.

```http
POST /api/services/calendar/get_events?return_response   {"entity_id":["calendar.calendar_1","calendar.calendar_2"],"start_date_time":"2026-11-06T15:31:13Z","duration":{"days":14}}
→ 200 {"changed_states":[],"service_response":{
  "calendar.calendar_1":{"events":[{"start":"2026-11-06T16:56:27.080073+01:00","end":"2026-11-06T17:56:27.080073+01:00","summary":"Future Event","description":"Future Description","location":"Future Location"}]},
  "calendar.calendar_2":{"events":[{"start":"2026-11-06T15:56:27.080183+01:00","end":"2026-11-06T16:56:27.080183+01:00","summary":"Current Event"}]}}}
```
`end_date_time` instead of `duration` works too. Datetimes are plain ISO strings in local TZ; absent fields are omitted (no `uid`/`rrule` for demo). Compare REST `/api/calendars/<id>?start=&end=`: `{"start":{"dateTime":"…"},"end":{"dateTime":"…"},"summary","description","location","uid":null,"recurrence_id":null,"rrule":null,"status":null}` and `GET /api/calendars` → `[{"name":"Calendar 1","entity_id":"calendar.calendar_1"}]`. Calendar entity attributes carry the next event in **local naive** strings (`"start_time":"2026-11-06 16:56:27"`).

```http
POST /api/services/todo/get_items?return_response   {"entity_id":"todo.shopping_list"}
→ {"changed_states":[],"service_response":{"todo.shopping_list":{"items":[{"summary":"Milk","uid":"6f09…","status":"needs_action"},{"summary":"Eggs","uid":"a0cb…","status":"needs_action"}]}}}
```
- `status:"completed"` filters; `status:["needs_action","completed"]` returns all. **No `status` returns ALL items** (verified with one `needs_action` + one `completed`: both returned), despite the services.yaml `default: needs_action`.
- `due`/`description` omitted when empty. State of todo entity = count of `needs_action`.
- WS `todo/item/list {entity_id}` → `{"items":[{"summary","uid","status"}]}`.
- WS `call_service … return_response:true` → `{"result":{"context":{…},"response":{"weather.demo_weather_south":{"forecast":[…]}}}}`.

## 7. Proxies

- `GET /api/camera_proxy/camera.demo_camera` + `Authorization` → `200 image/jpg` (43 713/43 965 B; two alternating frames), `camera.demo_camera_png` → `200 image/png` (232 693 B). No `Cache-Control`.
- Without auth or token → `403 text/plain "403: Forbidden"`. `?token=<attributes.access_token>` without header → `200`. Bad token → `403`. Unknown camera → `404`. `?width=100&height=50` → `200` resized (5 767 B).
- `camera.demo_camera` states: `streaming`; `supported_features:3` (ON_OFF=1|STREAM=2), `without_stream` = `1`. `camera/stream {entity_id,format:"hls"}` → error `start_stream_failed … does not support streaming` (no stream integration in the demo). `camera/capabilities` → `{"frontend_stream_types":["hls"],"two_way_audio":false}`. `camera_proxy_stream` (MJPEG) never ends (client timeout).
- The camera `access_token` attribute **rotates**: a watcher saw the first rotation ~110 s after start of watching (token also differed between two reads ~1 min apart earlier), and the **previous token still returned `200`** after rotation. So an `entity_picture` URL stays usable for a while but must be refreshed from the state stream; don't cache camera URLs long-term. Exact interval/number of retained tokens: unverified.
- Signed paths: `auth/sign_path {path,expires}` → `{"path":"/api/camera_proxy/camera.demo_camera?authSig=<jwt>"}`; works without Authorization (`200`); after expiry → `403`. Best option for server-side generated, time-boxed image URLs.
- Media player: attribute `entity_picture = "/api/media_player_proxy/media_player.living_room?token=faf8…933c&cache=bc2ffb49c4f67034"` (present for living_room/bedroom/walkman/kitchen/lounge_room; **absent** for `browse`, `group`, `search`). `GET` with token **and without Authorization** → `200 image/jpeg` 22 804 B, `Cache-Control: max-age=3600`. Without token + without header → `403`; without token + with Bearer → `200`; bad token → `403`. Token unchanged after play/pause state changes (token is per entity, not per media item; `cache=` hash changes with the content). Expiry across HA restart / long time: **unverified**.
- Image entities: **none** in demo (`image.*` absent), so `/api/image_proxy/…` **unverified**.
- `entity_picture` otherwise only present for `update.*` (`/api/brands/integration/demo/icon.png`, no token needed) and cameras/media players. **`person.test` has none.**

## 8. Domain states and attributes (real demo values)

Supported features seen: alarm_control_panel `63`; camera `3`,`1`; climate `385`,`943`,`442`; cover `11`,`15`,`511`,`3`,`240`; fan `55`,`49`,`56`; humidifier `0`,`1`; lawn_mower `15`; light `4`,`0`; lock `0`,`1`; media_player `119695`,`914877`,`121265`,`4325376`,`643983`,`4194304`; remote `0`; siren `3`,`31`; update `0`,`11`,`31`; vacuum `32700`,`12348`,`12296`,`3`,`0`; valve `3`,`15`; water_heater `15`; weather `1`,`7`; todo `15`; notify/conversation `1`. 0 entities `unavailable`, 10 `unknown`.

```jsonc
vacuum.demo_vacuum_0_ground_floor  cleaning  {"fan_speed_list":["min","medium","high","max"],"fan_speed":"medium","cleaned_area":1.32,"supported_features":32700}  // others "docked"; NO battery_level attr in this version
lawn_mower.my_lawn_mower           docked    {"supported_features":15}
person.test                        unknown   {"editable":true,"id":"test","device_trackers":[],"in_zones":[],"user_id":"c962…"}   // no entity_picture, no lat/long when unknown
device_tracker.demo_paulus         not_home  {"source_type":"gps","latitude":52.3757789,"longitude":4.8805847,"gps_accuracy":144,"battery":40}   // demo_home_boy = home
zone.home                          0         {"latitude":52.373,"longitude":4.890,"radius":100,"passive":false,"persons":[],"device_trackers":[],"editable":true,"icon":"mdi:home"}   // state = count of persons
input_boolean.guest_mode           off       {"editable":false,"icon":"mdi:account-multiple"}
input_number.target_humidity       30.0      {"min":30,"max":70,"step":1,"mode":"slider","initial":null,"editable":false,"unit_of_measurement":"%"}
input_select.house_mode            Home      {"options":["Home","Away","Night","Party"],"editable":false}
counter.coffee_cups                0         {"editable":false,"initial":0,"step":1,"icon":"mdi:coffee"}
timer.laundry                      idle      {"duration":"0:45:00","editable":false,"last_transition":null}   // active adds finishes_at/remaining (unverified)
update.demo_update_no_install      on        {"auto_update":false,"display_precision":0,"installed_version":"1.0.0","in_progress":false,"latest_version":"1.0.1","release_summary":"…","release_url":"https://www.example.com/release/1.0.1","skipped_version":null,"title":"Awesomesoft Inc.","update_percentage":null,"entity_picture":"/api/brands/integration/demo/icon.png","supported_features":0}  // features 11/31 on installable ones
valve.front_garden                 open      {"is_closed":false,"supported_features":3}  // orchard closed; features 15 = position-capable
water_heater.demo_water_heater     eco       {"min_temp":43.3,"max_temp":60,"target_temp_step":1,"operation_list":["eco","electric","performance","high_demand","heat_pump","gas","off"],"current_temperature":null,"temperature":48.3,"temperature_unit":"°C","operation_mode":"eco","away_mode":"off","supported_features":15}
humidifier.humidifier              on        {"min_humidity":0,"max_humidity":100,"target_humidity_step":5,"action":"humidifying","current_humidity":45,"humidity":65,"device_class":"humidifier","supported_features":0}
siren.siren                        on        {"supported_features":3}   // siren_with_all_features 31
event.push_button_press            2026-11-06T15:30:57.074+00:00  {"event_types":["pressed"],"event_type":"pressed","device_class":"button"}   // state=timestamp or unknown
alarm_control_panel.security       disarmed  {"code_format":"number","changed_by":null,"code_arm_required":true,"previous_state":null,"next_state":null,"supported_features":63}  // transitional: arming
weather.demo_weather_south         sunny     {"temperature":21.6,"temperature_unit":"°C","humidity":92,"pressure":1099,"pressure_unit":"hPa","wind_speed":1.8,"wind_speed_unit":"km/h","visibility_unit":"km","precipitation_unit":"mm","attribution":"Powered by Home Assistant","supported_features":1}  // north: rainy, features 7
sun.sun                            above_horizon  {"next_dawn":"…","next_dusk":"…","next_rising":"…","next_setting":"…","elevation":3.6,"azimuth":237.85,"rising":false}
calendar.calendar_1                off       {"message":"Future Event","all_day":false,"start_time":"2026-11-06 16:56:27","end_time":"2026-11-06 17:56:27","location":"Future Location","description":"Future Description"}   // calendar_2 = on
todo.shopping_list                 0         {"supported_features":15}   // state = number of open items
climate.heatpump                   heat      {"hvac_modes":["heat","off"],"min_temp":7,"max_temp":35,"current_temperature":25,"temperature":20,"hvac_action":"heating","supported_features":385}  // ecobee heat_cool: target_temp_low/high, preset_modes, fan_modes
cover.living_room_window           open      {"current_position":70,"current_tilt_position":50,"supported_features":511}  // is_closed bool; transitional closing/opening
fan.living_room_fan                off/on    {"percentage":50,"percentage_step":33.33,"preset_modes":[…],"direction":"forward","oscillating":false,"supported_features":55}
lock.front_door                    locked    {"supported_features":0}  // transitional locking/unlocking; features 1 = OPEN
scene.relax / button.push          timestamp or unknown  // scene attrs {"entity_id":[…],"id":"relax"}
script.movie_night                 off       {"last_triggered":"…","mode":"single","current":0}
automation.…                       on        {"id":"1700000000001","last_triggered":"…","mode":"single","current":0}
select.speed ridiculous_speed {"options":[…]};  number.volume 42.0 {"min":0,"max":100,"step":1,"mode":"slider"}
text.text "Hello world" {"mode":"text","min":0,"max":255,"pattern":null}; date/time/datetime states ISO strings
geo_location.waterspout 10.3 {"source":"demo","latitude":…,"longitude":…,"unit_of_measurement":"km"}
air_quality.demo_air_quality_home 14 {"particulate_matter_2_5":14,"particulate_matter_10":23,"nitrogen_oxide":100,"unit_of_measurement":"μg/m³"}
media_player.living_room playing {"volume_level":1,"is_volume_muted":false,"media_content_id":"…","media_content_type":"movie","media_duration":300,"media_position":309,"media_title":"…","app_name":"YouTube","sound_mode":"Music","sound_mode_list":[…],"shuffle":false,"entity_picture":"/api/media_player_proxy/…?token=…&cache=…","supported_features":119695}
```
Sensors: `sensor.outside_temperature` `15.6` `{"state_class":"measurement","unit_of_measurement":"°C","device_class":"temperature"}`; `sensor.total_energy_kwh` `0.5` (`state_class:"total"`); timestamp sensors (`sensor.sun_next_dawn` `2026-11-07T06:09:59+00:00`, `device_class:"timestamp"`); enum sensors (`sensor.thermostat` `eco`, `device_class:"enum"`, `options`); `unknown` for never-set values. Binary sensors: `moisture`, `motion`, `battery_charging`. `/api/config.unit_system`: `{"length":"km","accumulated_precipitation":"mm","area":"m²","mass":"g","pressure":"Pa","temperature":"°C","volume":"L","wind_speed":"m/s"}`.
Not present in demo: `humidifier` action variety, `alert`, `image`, `input_datetime/text/button`, `schedule`, `plant`, no active timer (so timer running-state attributes unverified). Lawn mower states other than `docked`, vacuum `battery_level` (absent here) unverified.

## 9. `get_services` and `render_template`

`GET /api/services` (57 556 B, 64 domains) → `[{"domain":"light","services":{"turn_on":{"fields":{…},"target":{…}}}}]`; WS `get_services` (55 963 B) → `{domain:{service:{fields,target,response?}}}`. **No `name`/`description`** at either (also `fields[*]` has no name/description). Excerpts:
```json
"light.turn_on":{"fields":{
  "transition":{"filter":{"supported_features":[32]},"selector":{"number":{"min":0,"max":300,"unit_of_measurement":"seconds","step":1,"mode":"slider"}}},
  "brightness_pct":{"filter":{"attribute":{"supported_color_modes":["brightness","color_temp","hs","xy","rgb","rgbw","rgbww"]}},"selector":{"number":{"min":0,"max":100,"unit_of_measurement":"%","step":1,"mode":"slider"}}},
  "rgb_color":{"filter":{…},"example":"[255, 100, 100]","selector":{"color_rgb":{}}},
  "effect":{"filter":{"supported_features":[4]},"selector":{"state":{"attribute":"effect","multiple":false}}},
  "additional_fields":{"collapsed":true,"fields":{"rgbw_color":{…},"color_name":{…selector.select.options[…]}}}},
 "target":{"entity":[{"domain":["light"]}]}}
"climate.set_temperature":{"fields":{"temperature":{"filter":{"supported_features":[1]},"selector":{"number":{"min":0,"max":250,"step":0.1,"mode":"box"}}},
  "temperature_range":{"fields":{"target_temp_high":{…"supported_features":[2]…},"target_temp_low":{…}}},"hvac_mode":{"selector":{"state":{"hide_states":["unavailable","unknown"],"multiple":false}}}},
  "target":{"entity":[{"domain":["climate"],"supported_features":[1,2]}]}}
"weather.get_forecasts":{"fields":{"type":{"required":true,"selector":{"select":{"options":["daily","hourly","twice_daily"],…}}}},"target":{"entity":[{"domain":["weather"],"supported_features":[1,2,4]}]},"response":{"optional":false}}
"todo.get_items":{"fields":{"status":{"example":"needs_action","default":"needs_action","selector":{"select":{"options":["needs_action","completed"],"multiple":true}}}},"target":{…},"response":{"optional":false}}
"lock.unlock":{"fields":{"code":{"example":1234,"selector":{"text":{"multiline":false,"multiple":false}}}},"target":{"entity":[{"domain":["lock"]}]}}
```
Field keys: `required, selector, example, default, filter, collapsed, fields` (groups). Selector kinds: `entity,number,config_entry,text,select,theme,boolean,object,datetime,statistic,state,media,conversation_agent,color_rgb,color_temp,area,icon,duration,date,time`. `response.optional:false` (response-only) services: `weather.get_forecasts, calendar.get_events, todo.get_items, recorder.get_statistics, media_player.browse_media/search_media, schedule.get_schedule, file.read_file, assist_satellite.ask_question, ai_task.*`; `optional:true`: `script.<id>`, `conversation.process`. `target.entity[].supported_features` lists alternative feature bits (any-of).

`render_template` (WS, any user):
```json
{"id":2,"type":"render_template","template":"{{ states('sensor.outside_temperature') }}","timeout":3}
→ {"id":2,"type":"result","success":true,"result":null}
→ {"id":2,"type":"event","event":{"result":15.6,"listeners":{"all":false,"entities":["sensor.outside_temperature"],"domains":[],"time":false}}}
// after POST /api/states/sensor.outside_temperature state=20.5 → another event {"result":20.5,…}
// template with domain-wide access: "listeners":{"all":false,"entities":[],"domains":["light"],"time":false}, result "5 lights on; {'a': 1}"
// syntax error with report_errors:true: result null, events {"error":"TemplateSyntaxError: unexpected 'end of print statement'","level":"ERROR"} (emitted twice)
```
`result` is a typed value (`15.6`, `41`) when the output parses as a literal, else string. Supports `variables`, `timeout`, `strict`, `report_errors`. REST `POST /api/template` → `200 text/plain` rendered string. The **render_template-based single-value tile** is a cheap alternative to `subscribe_entities` for derived values.
`unsubscribe_events` works for it.

## 10. Registries / area mapping

`config/entity_registry/list_for_display` → `{"entity_categories":{"0":"config","1":"diagnostic"},"entities":[…]}` with 99 entities (states has 135; **entities without unique_id are not here**, e.g. REST-set virtual ones). Keys: `ei` entity_id, `pl` platform, `lb` label ids, `di` device_id, `np` name-part kind (`"device"`/`"area"`; `np:"area"` = the entity name is its own, not device-derived), `tk` translation_key, `ec` entity_category index, `en` entity name (**only when it has its own name**, e.g. `person.test`→`"test"`), `ai` entity-own area_id, `dp` display precision, `hb` hidden (`true` only when hidden; disabled entities are excluded).
```json
{"ei":"sensor.outside_temperature","pl":"demo","lb":[],"di":"418cf47b…","np":"device","dp":1}
{"ei":"person.test","pl":"person","lb":[],"en":"test"}
{"ei":"light.bed_light","pl":"demo","lb":[],"di":"2f87…","np":"device","tk":"bed_light","hb":true}           // after hidden_by=user
{"ei":"light.ceiling_lights","pl":"demo","ai":"kitchen","lb":[],"di":"c1b3…","np":"area","en":"Zed"}      // after name="Zed", area_id=kitchen (device in living_room)
```
Pristine demo: 3 areas (`bedroom`, `kitchen`, `living_room`; keys `aliases,area_id,floor_id,humidity_entity_id,icon,labels,name,picture,temperature_entity_id,created_at,modified_at`), 0 floors, **no entity and no device assigned to an area**, 62 devices. So any tile "area" grouping must handle "unassigned".
Device registry entry (excerpt): `{"id":"c1b3…","area_id":"living_room","name":"Ceiling Lights","name_by_user":null,"manufacturer":null,"model":null,"disabled_by":null,"entry_type":null,"identifiers":[["demo","light_2"]],"config_entries":[…],"primary_config_entry":"…","via_device_id":null,"parent_device_id":null,"next_name_part":"area",…}`.
Mapping rule verified: `effective_area = entity.ai ?? device(entity.di).area_id`. After setting device `c1b3…` → `living_room` and the entity override → `kitchen`, display list shows `ai:"kitchen"` while the device list shows `living_room`. Setting `area_id` on a nameless entity: `{"code":"invalid_info","message":"An entity without a name of its own cannot have an area of its own, set the area on its device instead"}`.
Other registry facts: `entity_registry_updated` events (`subscribe_events`) carry `{"action":"update","entity_id":…,"changes":{<changed field>:<OLD value>}}`. `config/entity_registry/get {entity_id}` → full entry (`area_id,categories,device_id,hidden_by,disabled_by,name,original_name,platform,unique_id,capabilities,options.conversation.should_expose,…`); `get_entries {entity_ids}` → map. `search/related {item_type:"entity",item_id}` → `{"device":[…],"config_entry":[…],"integration":["demo"]}` (no `area` key because none assigned). `friendly_name` in the state becomes `"<device name> <entity name>"` (`"Ceiling Lights Zed"`). `person.*` states have no `entity_picture`.
All registry changes were reverted.

## 11. Auth failures

```text
GET /api/states  Authorization: Bearer badtoken        → 401 text/plain "401: Unauthorized"
GET /api/states  (no header)                            → 401 same
GET /api/states  Bearer <well-formed unsigned JWT>      → 401 same
GET /api/                                               → 200 {"message":"API running."}
WS: ← {"type":"auth_required","ha_version":"2026.11.0"}
    → {"type":"auth","access_token":"badtoken"}
    ← {"type":"auth_invalid","message":"Invalid access token or password"}      (socket then closed, code 1000)
WS non-auth first: → {"id":1,"type":"get_states"}
    ← {"type":"auth_invalid","message":"Auth message incorrectly formatted: not a valid option at 'id'. Got 1\nnot a valid value at 'type'. Got 'get_states'"}   (closed 1000)
```
Note: the version (`ha_version`) is exposed pre-auth in `auth_required`. A good token yields `{"type":"auth_ok","ha_version":…}` (the script resolved on that).

## 12. Not verified / caveats

- Hourly+ statistics data and `units` conversion (container too young; first hour compile at 16:00 UTC).
- Exact camera token rotation interval and how many previous tokens stay valid (only first rotation + old token still valid observed).
- `image_proxy` (no `image.*` entity), media-player token expiry across restart/long time, timer running attributes, vacuum battery.
- `significant_changes_only=true` differences for climate/humidifier-type domains and long-gap numeric sensors; effect of `include_start_time_state` with data older than the window.
- `subscribe_entities` behaviour on registry-driven entity removals/additions (only `POST/DELETE /api/states` virtual entities were tested), and `supported_features` coalescing (`coalesce_messages`).
- Non-admin token behaviour (only the owner token was used).
