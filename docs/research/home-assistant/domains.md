# Home Assistant entity domain catalog (for Homarr tiles)

Research date 2026-11-06, branch `dev` of both repos. Everything below was read from primary sources.

Sources (base URLs; abbreviations used per section):
- **core**: `https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/<domain>/{const.py,__init__.py,services.yaml,icons.json,strings.json}`
- **fe-active**: `https://raw.githubusercontent.com/home-assistant/frontend/dev/src/common/entity/state_active.ts`
- **fe-color**: `https://raw.githubusercontent.com/home-assistant/frontend/dev/src/common/entity/state_color.ts`
- **fe-theme**: `https://raw.githubusercontent.com/home-assistant/frontend/dev/src/resources/theme/color/color.globals.ts` (`--state-*` values)
- **fe-const**: `https://raw.githubusercontent.com/home-assistant/frontend/dev/src/common/const.ts`
- **fe-icons**: `https://raw.githubusercontent.com/home-assistant/frontend/dev/src/data/icons.ts` (`FALLBACK_DOMAIN_ICONS`)
- **fe-battery**: `https://raw.githubusercontent.com/home-assistant/frontend/dev/src/common/entity/color/battery_color.ts`
- Docs: `https://developers.home-assistant.io/docs/core/entity/<domain>`, `https://www.home-assistant.io/integrations/<domain>/`

Notes on gaps: `vacuum`/`lawn_mower` activity states, `person`/`device_tracker`/`zone`/`input_*`/`counter`/`timer`/`group` state sets, and the `light.turn_on` field list (a Python voluptuous schema, not in services.yaml fields) come from the core `__init__.py` / developer docs and are marked *(core __init__/docs)*. Frontend theme dark-mode overrides were not enumerated (only light-theme defaults shown; dark mode redefines some of the same vars).

Common to all: `state` may be `unavailable` or `unknown`; `unavailable` renders with `--state-unavailable-color` (= `--disabled-text-color` `#bdbdbd`) and is never "active". Common attributes: `friendly_name`, `icon`, `entity_picture`, `device_class`, `supported_features` (int bitmask), `attribution`.

---

## 1. Frontend rules

### 1.1 Active state (fe-active)
1. Domains in `TIMESTAMP_STATE_DOMAINS` (`ai_task, button, conversation, event, image, infrared, input_button, notify, radio_frequency, scene, stt, tag, tts, wake_word, datetime`): active = state != `unavailable`.
2. `unavailable`/`unknown` → inactive.
3. `off` → inactive (except domain `alert`).
4. Per-domain overrides (active when…):

| Domain | Active |
|---|---|
| alarm_control_panel | != `disarmed` |
| cover | != `closed` |
| valve | != `closed` |
| lock | != `locked` (unlocked/open/jammed/locking/unlocking = active) |
| device_tracker, person | != `not_home` |
| lawn_mower | not in `docked, paused, idle` |
| vacuum | not in `idle, docked, paused` |
| media_player | != `standby` (so `idle`, `playing`, `paused`, `on`, `buffering` are active) |
| timer | == `active` |
| camera | `streaming` or `recording` |
| group | in `on, home, open, locked, problem` |
| everything else (light, switch, fan, climate, humidifier, water_heater, update, siren, remote, sun, weather, binary_sensor, input_boolean, automation, script, calendar…) | any state other than off/unavailable/unknown |

### 1.2 Color resolution (fe-color)
`STATE_COLORED_DOMAIN` = alarm_control_panel, alert, automation, binary_sensor, calendar, camera, climate, cover, device_tracker, fan, group, humidifier, input_boolean, lawn_mower, light, lock, media_player, person, plant, remote, schedule, script, siren, sun, switch, timer, update, vacuum, valve, water_heater, weather. Other domains (sensor, number, select, input_number, button, scene, …) get **no** state color (neutral/`--state-icon-color` `#44739e` by `ha-state-icon`).

CSS var lookup order (first defined wins), `active ? "active" : "inactive"`, `stateKey = slugify(state,"_")`:
1. `--state-<domain>-<device_class>-<stateKey>-color` (only if device_class)
2. `--state-<domain>-<stateKey>-color`
3. `--state-<domain>-<active|inactive>-color`
4. `--state-<active|inactive>-color`

Special cases: `sensor` + `device_class: battery` numeric → `--state-sensor-battery-high-color` (>=70, green) / `-medium-` (>=30, orange) / `-low-` (<30, red) (fe-battery). `group` uses the group's common domain. `unavailable` → `--state-unavailable-color`. Light brightness dimming: `brightness((brightness + 245) / 5 %)` (≈ 50% min) (`stateColorBrightness`); light icon color is additionally overridden by the entity's `rgb_color`/`hs_color` in tiles.

### 1.3 Theme color values (fe-theme, light theme)
Palette: red `#f44336`, pink `#e91e63`, purple `#926bc7`, indigo `#3f51b5`, blue `#2196f3`, light-blue `#03a9f4`, cyan `#00bcd4`, teal `#009688`, green `#4caf50`, light-green `#8bc34a`, lime `#cddc39`, yellow `#ffeb3b`, amber `#ffc107`, orange `#ff9800`, deep-orange `#ff6f22`, brown `#795548`, grey `#9e9e9e`. (deep-purple, blue-grey, light-grey used by weather are defined in same file.)

Defaults: `--state-active-color` = amber, `--state-inactive-color` = grey, `--state-unavailable-color` = `#bdbdbd`, `--state-icon-color` = `#44739e`, `--state-icon-error-color` = `--error-color`.

| Var | Value |
|---|---|
| `--state-alarm_control_panel-armed_{away,home,night,vacation,custom_bypass}-color` | green |
| `--state-alarm_control_panel-{arming,disarming,pending}-color` | orange |
| `--state-alarm_control_panel-triggered-color` | red |
| `--state-alert-on-color` / `-off-color` | red / orange |
| `--state-binary_sensor-active-color` | amber |
| `--state-binary_sensor-<dc>-on-color` for dc in battery, carbon_monoxide, gas, glass_break, heat, lock, moisture, problem, safety, smoke, sound, tamper | red |
| `--state-climate-auto-color` | green |
| `--state-climate-cool-color` | blue |
| `--state-climate-dry-color` | orange |
| `--state-climate-fan_only-color` | cyan |
| `--state-climate-heat-color` | deep-orange |
| `--state-climate-heat-cool-color` | amber |
| `--state-cover-active-color` | purple |
| `--state-device_tracker-active-color` / `-home-color` | blue / green |
| `--state-person-active-color` / `-home-color` | blue / green |
| `--state-fan-active-color` | cyan |
| `--state-humidifier-on-color` | blue |
| `--state-lawn_mower-active-color` / `-error-color` | teal / red |
| `--state-light-active-color` | amber |
| `--state-lock-locked-color` | green |
| `--state-lock-{unlocked,open,jammed}-color` | red |
| `--state-lock-{locking,unlocking,opening}-color` | orange |
| `--state-media_player-active-color` | light-blue |
| `--state-plant-active-color` | red |
| `--state-siren-active-color` | red |
| `--state-sun-above_horizon-color` / `-below_horizon-color` | amber / indigo |
| `--state-switch-active-color` | amber |
| `--state-update-active-color` | orange |
| `--state-vacuum-active-color` / `-error-color` | teal / red |
| `--state-valve-active-color` | blue |
| `--state-water_heater-eco-color` | green |
| `--state-water_heater-{electric,gas,heat_pump}-color` | orange |
| `--state-water_heater-{high_demand,performance}-color` | deep-orange |
| `--state-weather-sunny` amber; `clear_night` deep-purple; `cloudy` light-grey; `partlycloudy` blue-grey; `fog` grey; `hail` cyan; `lightning` yellow; `lightning_rainy` lime; `pouring` indigo; `rainy` blue; `snowy` `#c0e0ff`; `snowy_rainy` light-blue; `windy`/`windy_variant` green; `exceptional` red | (`--state-weather-<state>-color`) |

Domains that fall back to `--state-active-color` (amber) when active, `--state-inactive-color` (grey) otherwise: automation, calendar, camera, group, input_boolean, remote, script, timer, plus any domain-specific unset (e.g. climate `idle`/`off`, media_player off).

### 1.4 Toggle (fe-const `DOMAINS_TOGGLE`)
Primary-toggle domains (frontend): `fan, input_boolean, light, switch, group, automation, humidifier, valve`. Other domains that natively support `turn_on/turn_off/toggle` services: `climate, water_heater (on/off), siren, remote, media_player, script, camera, vacuum(deprecated)`. `homeassistant.toggle/turn_on/turn_off` forward to the domain service (works for any domain implementing them, plus cover/lock/scene special mapping: `homeassistant.turn_on` on cover → `open_cover`, lock → `lock`? — core maps cover open/close and lock/unlock, scene/script/automation turn_on). `homeassistant.toggle` services list: `homeassistant/services.yaml`: `toggle, turn_on, turn_off, update_entity, ...` (all take `entity_id`).

`DOMAINS_WITH_DYNAMIC_PICTURE` = camera, image, media_player. `DOMAINS_WITH_CARD` (state card/more-info special controls) = alert, button, climate, cover, configurator, event, input_button, input_select, input_number, input_text, humidifier, lawn_mower, lock, media_player, number, scene, script, select, timer, text, update, vacuum, water_heater.

### 1.5 Domain fallback icons (fe-icons `FALLBACK_DOMAIN_ICONS`; used when core icons.json has no entry)
alert mdi:alert, automation mdi:robot, calendar mdi:calendar, climate mdi:thermostat, counter mdi:counter, date mdi:calendar, datetime mdi:calendar-clock, device_tracker mdi:account, group mdi:google-circles-communities, input_boolean mdi:toggle-switch, input_button mdi:button-pointer, input_datetime mdi:calendar-clock, input_number mdi:ray-vertex, input_select mdi:format-list-bulleted, input_text mdi:form-textbox, lawn_mower mdi:robot-mower, light mdi:lightbulb, notify mdi:comment-alert, number mdi:ray-vertex, person mdi:account, plant mdi:flower, remote mdi:remote, scene mdi:palette, schedule mdi:calendar-clock, script mdi:script-text, select mdi:format-list-bulleted, sensor mdi:eye, siren mdi:bullhorn, sun mdi:white-balance-sunny, text mdi:form-textbox, time mdi:clock, timer mdi:timer-outline, todo mdi:clipboard-list, vacuum mdi:robot-vacuum, weather mdi:weather-partly-cloudy, zone mdi:map-marker-radius, image mdi:image, humidity mdi:water-percent, illuminance mdi:brightness-6, temperature mdi:thermometer, power mdi:flash.

---

## 2. Domain catalog

Legend: **FEAT** = `supported_features` bitmask (core `const.py`). Icon = from core `icons.json` entity_component (`_` = default). All entity_ids are `<domain>.<object_id>`.

### light
Source: core `light/const.py`, `light/services.yaml`, `light/icons.json`; docs `/docs/core/entity/light`.
- State: `on`, `off`, `unavailable`, `unknown`.
- Attributes: `brightness` (int 0-255; absent when off), `color_mode` (`onoff|brightness|color_temp|hs|xy|rgb|rgbw|rgbww|white|unknown`), `supported_color_modes` (list of those, **required to decide UI**), `color_temp_kelvin` (int K), `min_color_temp_kelvin`, `max_color_temp_kelvin`, (legacy `color_temp` mireds, `min_mireds`, `max_mireds` removed/deprecated), `hs_color` [h 0-360, s 0-100], `rgb_color` [r,g,b 0-255], `rgbw_color`, `rgbww_color`, `xy_color`, `effect` (current), `effect_list`.
- FEAT `LightEntityFeature`: `EFFECT=4`, `FLASH=8`, `TRANSITION=32`.
- Services: `light.turn_on` fields *(core __init__ schema)*: `transition` (s), `brightness` (0-255), `brightness_pct` (0-100), `brightness_step`/`brightness_step_pct`, `color_temp_kelvin`, `hs_color`, `rgb_color`, `rgbw_color`, `rgbww_color`, `xy_color`, `color_name`, `white` (use brightness), `profile`, `flash` (`short|long`), `effect`; `light.turn_off` (`transition`, `flash` n/a); `light.toggle` (same fields as turn_on). Toggle: yes.
- Color: `--state-light-active-color` amber (or entity rgb). Icon: `_` mdi:lightbulb, off mdi:lightbulb-off.
- UI hint: brightness slider if any color mode other than `onoff`; color picker if mode in hs/xy/rgb*; color-temp slider if `color_temp` in modes (range min/max_color_temp_kelvin).

### switch
Source: core `switch/` (const, services.yaml, icons.json).
- State: `on/off`. Attributes: none standard. `device_class`: `outlet`, `switch`. FEAT: none.
- Services: `switch.turn_on/turn_off/toggle`. Toggle yes.
- Color: `--state-switch-active-color` amber. Icon: `_`/switch mdi:toggle-switch-variant (off …-off); outlet mdi:power-plug (off mdi:power-plug-off).

### input_boolean
- State on/off. Attributes: `editable` (bool), `initial`. Services `input_boolean.turn_on/turn_off/toggle/reload`. Toggle yes.
- Color: grey/amber via generic (`--state-active-color`). Icon: mdi:check-circle-outline / off mdi:close-circle-outline (core), fallback mdi:toggle-switch.

### fan
Source: core `fan/const.py`, `fan/services.yaml`, `fan/icons.json`.
- State on/off. Attributes: `percentage` (0-100), `percentage_step`, `preset_mode`, `preset_modes`, `oscillating` (bool), `direction` (`forward|reverse`).
- FEAT `FanEntityFeature`: `SET_SPEED=1, OSCILLATE=2, DIRECTION=4, PRESET_MODE=8, TURN_OFF=16, TURN_ON=32`.
- Services: `fan.turn_on(percentage,preset_mode)`, `turn_off`, `toggle`, `set_percentage(percentage)`, `set_preset_mode(preset_mode)`, `oscillate(oscillating)`, `set_direction(direction)`, `increase_speed/decrease_speed(percentage_step)`. Toggle yes.
- Color `--state-fan-active-color` cyan. Icon mdi:fan / off mdi:fan-off.

### climate
Source: core `climate/const.py`, `climate/services.yaml`.
- State = HVAC mode: `off, heat, cool, heat_cool, auto, dry, fan_only` (+ unavailable/unknown).
- Attributes: `hvac_modes`, `hvac_action` (`cooling, defrosting, drying, fan, heating, idle, off, preheating`), `current_temperature`, `temperature` (setpoint), `target_temp_high`, `target_temp_low`, `target_temp_step`, `min_temp`, `max_temp`, `current_humidity`, `humidity` (target), `min_humidity`, `max_humidity`, `target_humidity_step`, `fan_mode`, `fan_modes`, `preset_mode`, `preset_modes` (standard: `none, eco, away, boost, comfort, home, sleep, activity`), `swing_mode`, `swing_modes` (`on, off, both, vertical, horizontal`), `swing_horizontal_mode`, `swing_horizontal_modes`. Fan modes standard: `on, off, auto, low, medium, high, top, middle, focus, diffuse`. Temperature unit follows HA unit system (state attrs already converted).
- FEAT `ClimateEntityFeature`: `TARGET_TEMPERATURE=1, TARGET_TEMPERATURE_RANGE=2, TARGET_HUMIDITY=4, FAN_MODE=8, PRESET_MODE=16, SWING_MODE=32, TURN_OFF=128, TURN_ON=256, SWING_HORIZONTAL_MODE=512`.
- Services: `climate.set_temperature(temperature | target_temp_low+target_temp_high [as `temperature_range` selector in UI], hvac_mode)`, `set_hvac_mode(hvac_mode)`, `set_preset_mode(preset_mode)`, `set_fan_mode(fan_mode)`, `set_swing_mode`, `set_swing_horizontal_mode`, `set_humidity(humidity)`, `turn_on`, `turn_off`, `toggle`. Toggle yes (if TURN_ON/OFF feature or off-mode).
- Color: `--state-climate-<state>-color`: heat deep-orange, cool blue, heat_cool amber, auto green, dry orange, fan_only cyan; `off` → inactive grey. (Tile frontend colors by hvac_mode/state, icon accent shows hvac_action in more-info.) Icon mdi:thermostat.

### water_heater
Source: core `water_heater/__init__.py`, `const.py`, services.yaml.
- State = operation mode: `eco, electric, performance, high_demand, heat_pump, gas, off` (+ custom).
- Attributes: `current_temperature`, `temperature`, `target_temp_high`, `target_temp_low`, `target_temp_step`, `min_temp`, `max_temp`, `operation_mode`, `operation_list`, `away_mode` (`on/off`).
- FEAT `WaterHeaterEntityFeature`: `TARGET_TEMPERATURE=1, OPERATION_MODE=2, AWAY_MODE=4, ON_OFF=8`.
- Services: `set_temperature(temperature, operation_mode)`, `set_operation_mode(operation_mode)`, `set_away_mode(away_mode)`, `turn_on`, `turn_off`.
- Color: eco green; electric/gas/heat_pump orange; high_demand/performance deep-orange. Icon mdi:water-boiler / off mdi:water-boiler-off.

### humidifier
- State on/off. Attributes: `humidity` (target %), `current_humidity`, `min_humidity`, `max_humidity`, `target_humidity_step`, `mode`, `available_modes`, `action` (`humidifying, drying, idle, off`). `device_class`: `humidifier|dehumidifier`.
- FEAT `HumidifierEntityFeature`: `MODES=1`.
- Services: `set_humidity(humidity)`, `set_mode(mode)`, `turn_on/off/toggle`. Toggle yes.
- Color `--state-humidifier-on-color` blue. Icon mdi:air-humidifier / off mdi:air-humidifier-off.

### cover
Source: core `cover/const.py`, `services.yaml`, `icons.json`.
- State: `open, closed, opening, closing`. Attributes: `current_position` (0 closed–100 open), `current_tilt_position`, `is_closed` is internal. device_class: `awning, blind, curtain, damper, door, garage, gate, shade, shutter, window`.
- FEAT `CoverEntityFeature`: `OPEN=1, CLOSE=2, SET_POSITION=4, STOP=8, OPEN_TILT=16, CLOSE_TILT=32, STOP_TILT=64, SET_TILT_POSITION=128, SPEED=256`.
- Services: `cover.open_cover`, `close_cover`, `stop_cover`, `toggle`, `set_cover_position(position 0-100)`, `open_cover_tilt`, `close_cover_tilt`, `stop_cover_tilt`, `toggle_cover_tilt`, `set_cover_tilt_position(tilt_position)`. (`speed` field newly present on open/close/set_position.) Not in `DOMAINS_TOGGLE`, but `cover.toggle` exists.
- Color `--state-cover-active-color` purple when != closed. Icons (default/closed/opening/closing): `_` window-open/window-closed/arrow-up-box/arrow-down-box; blind mdi:blinds-horizontal(-closed); curtain mdi:curtains(-closed); damper mdi:circle(closed mdi:circle-slice-8); door mdi:door-open/mdi:door-closed; garage mdi:garage-open/mdi:garage; gate mdi:gate-open/mdi:gate; shade mdi:roller-shade(-closed); shutter mdi:window-shutter-open/mdi:window-shutter; window mdi:window-open/window-closed.

### valve
- State `open, closed, opening, closing`. Attributes: `current_position` (0-100). device_class `water|gas`.
- FEAT `ValveEntityFeature`: `OPEN=1, CLOSE=2, SET_POSITION=4, STOP=8`.
- Services: `valve.open_valve`, `close_valve`, `stop_valve`, `toggle`, `set_valve_position(position)`. Toggle yes (in `DOMAINS_TOGGLE`).
- Color `--state-valve-active-color` blue when != closed. Icon `_`/water mdi:valve-open (closed mdi:valve-closed, opening/closing mdi:valve); gas mdi:meter-gas.

### lock
Source: core `lock/const.py`.
- State: `locked, unlocked, locking, unlocking, jammed, open, opening`. Attributes: `changed_by`, `code_format` (regex string or null; when set a code is required to operate).
- FEAT `LockEntityFeature`: `OPEN=1`.
- Services: `lock.lock(code?)`, `lock.unlock(code?)`, `lock.open(code?)` (needs OPEN feature). Not toggleable via `homeassistant.toggle` meaningfully (`homeassistant.turn_on` → lock? treat as lock/unlock explicit).
- Color: locked green; unlocked/open/jammed red; locking/unlocking/opening orange. Active = != locked. Icon `_` mdi:lock, unlocked/open mdi:lock-open-variant, jammed mdi:lock-alert, locking/unlocking/opening mdi:lock-clock.

### alarm_control_panel
Source: core `alarm_control_panel/const.py`, services.yaml, icons.json.
- State: `disarmed, armed_home, armed_away, armed_night, armed_vacation, armed_custom_bypass, pending, arming, disarming, triggered`.
- Attributes: `code_format` (`text|number|null`), `changed_by`, `code_arm_required` (bool; if false arming needs no code, disarm still does).
- FEAT `AlarmControlPanelEntityFeature`: `ARM_HOME=1, ARM_AWAY=2, ARM_NIGHT=4, TRIGGER=8, ARM_CUSTOM_BYPASS=16, ARM_VACATION=32`.
- Services (all take optional `code`): `alarm_arm_home`, `alarm_arm_away`, `alarm_arm_night`, `alarm_arm_vacation`, `alarm_arm_custom_bypass`, `alarm_disarm`, `alarm_trigger`.
- Color: armed_* green; pending/arming/disarming orange; triggered red; disarmed inactive grey. Icon `_` mdi:shield, armed_away mdi:shield-lock, armed_home mdi:shield-home, armed_night mdi:shield-moon, armed_vacation mdi:shield-airplane, armed_custom_bypass mdi:security, disarmed mdi:shield-off, pending mdi:shield-outline, triggered mdi:bell-ring.

### media_player
Source: core `media_player/const.py`, services.yaml, icons.json.
- State: `off, on, idle, playing, paused, buffering, standby, unavailable, unknown` (`standby` appears in older/integration states; frontend treats as inactive).
- Attributes: `volume_level` (0.0-1.0), `is_volume_muted`, `media_content_id`, `media_content_type` (`music, tvshow, video, episode, channel, playlist, ...`), `media_duration` (s), `media_position` (s), `media_position_updated_at` (ISO ts; current pos = media_position + now - updated_at while playing), `media_title`, `media_artist`, `media_album_name`, `media_album_artist`, `media_track`, `media_series_title`, `media_season`, `media_episode`, `media_channel`, `media_playlist`, `app_id`, `app_name`, `source`, `source_list`, `sound_mode`, `sound_mode_list`, `shuffle`, `repeat` (`off|all|one`), `group_members`, `entity_picture` (proxy path `/api/media_player_proxy/<entity>?token=…&cache=…`), `entity_picture_local`.
- FEAT `MediaPlayerEntityFeature`: `PAUSE=1, SEEK=2, VOLUME_SET=4, VOLUME_MUTE=8, PREVIOUS_TRACK=16, NEXT_TRACK=32, TURN_ON=128, TURN_OFF=256, PLAY_MEDIA=512, VOLUME_STEP=1024, SELECT_SOURCE=2048, STOP=4096, CLEAR_PLAYLIST=8192, PLAY=16384, SHUFFLE_SET=32768, SELECT_SOUND_MODE=65536, BROWSE_MEDIA=131072, REPEAT_SET=262144, GROUPING=524288, MEDIA_ANNOUNCE=1048576, MEDIA_ENQUEUE=2097152, SEARCH_MEDIA=4194304`. (Bit 64 unused/legacy.)
- Services: `turn_on`, `turn_off`, `toggle`, `volume_up`, `volume_down`, `volume_mute(is_volume_muted)`, `volume_set(volume_level)`, `media_play_pause`, `media_play`, `media_pause`, `media_stop`, `media_next_track`, `media_previous_track`, `media_seek(seek_position)`, `play_media(media{media_content_id,media_content_type}, enqueue, announce)`, `browse_media`, `search_media`, `select_source(source)`, `select_sound_mode(sound_mode)`, `clear_playlist`, `shuffle_set(shuffle)`, `repeat_set(repeat)`, `join(group_members)`, `unjoin`. Primary: `media_play_pause` (works if PAUSE|PLAY). Toggle: on/off via `media_player.toggle` (TURN_ON/OFF).
- Color `--state-media_player-active-color` light-blue (!= off/standby). Icons by `device_class`: `_` mdi:cast (off cast-off, paused/playing cast-connected); speaker mdi:speaker (off speaker-off, paused speaker-pause, playing speaker-play); tv mdi:television (off television-off, paused television-pause, playing television-play); receiver mdi:audio-video (off audio-video-off); projector mdi:projector (off projector-off).

### vacuum
Source: core `vacuum/const.py`, services.yaml.
- State (`VacuumActivity` *(core __init__)*): `cleaning, docked, idle, paused, returning, error`.
- Attributes: `battery_level` (deprecated; use separate battery sensor), `battery_icon`, `fan_speed`, `fan_speed_list`, `status`, `cleaned_area`.
- FEAT `VacuumEntityFeature`: `TURN_ON=1`(deprecated), `TURN_OFF=2`(deprecated), `PAUSE=4, STOP=8, RETURN_HOME=16, FAN_SPEED=32, STATUS=128`(deprecated), `SEND_COMMAND=256, LOCATE=512, CLEAN_SPOT=1024, MAP=2048, STATE=4096, START=8192, CLEAN_AREA=16384`.
- Services: `vacuum.start`, `pause`, `stop`, `return_to_base`, `locate`, `clean_spot`, `clean_area(cleaning_area_id)`, `send_command(command, params)`, `set_fan_speed(fan_speed)`.
- Color: active (cleaning/returning/error) `--state-vacuum-active-color` teal; `error` red; docked/idle/paused inactive. Icon mdi:robot-vacuum.

### lawn_mower
- State (`LawnMowerActivity` *(core __init__)*): `mowing, docked, paused, returning, error`.
- FEAT `LawnMowerEntityFeature`: `START_MOWING=1, PAUSE=2, DOCK=4, STOP=8`. (STOP is newer.)
- Services: `lawn_mower.start_mowing`, `pause`, `dock`, `stop`.
- Color active teal (`--state-lawn_mower-active-color`), `error` red; inactive when docked/paused/idle. Icon mdi:robot-mower.

### camera
- State: `idle, recording, streaming`. Attributes: `access_token`, `entity_picture` (`/api/camera_proxy/<entity>?token=…`), `brand`, `model_name`, `motion_detection`, `frontend_stream_type` (`hls|web_rtc`).
- FEAT `CameraEntityFeature`: `ON_OFF=1, STREAM=2`.
- Services: `camera.turn_on`, `turn_off`, `enable_motion_detection`, `disable_motion_detection`, `snapshot(filename)`, `play_stream(media_player, format)`, `record(filename, duration, lookback)`. Image: `/api/camera_proxy/<id>` (poll) or `/api/camera_proxy_stream/<id>` (mjpeg), both with `?token=` or Bearer.
- Color active only when streaming/recording (generic amber). Icon mdi:video / off mdi:video-off.

### image
- State: timestamp of last image update (ISO). Attributes: `access_token`, `entity_picture` (`/api/image_proxy/<entity>?token=…`), `content_type`, `image_last_updated`. No services. Icon mdi:image.

### scene
- State: ISO timestamp of last activation (or `unknown`). Attributes: `entity_id` (members), `id`.
- Services: `scene.turn_on(transition)`, `reload`, `apply`, `create`, `delete`. Primary: `scene.turn_on`. Not toggle. Icon mdi:palette.

### script
- State `on` (running) / `off`. Attributes: `last_triggered`, `mode`, `current`, `max`, `last_action`.
- Services: `script.turn_on` (entity_id; no variables — runs and does not wait), `script.toggle`, `script.turn_off` (stop), `script.<object_id>(variables…)` (runs and **waits**, accepts script fields), `script.reload`. Dashboard: use `script.turn_on` with `entity_id`, or `script.<name>` for fields.
- Color generic amber when on. Icon mdi:script-text (on mdi:script-text-play).

### automation
- State on/off (enabled/disabled). Attributes: `last_triggered`, `mode`, `current` (running count), `max`, `id`.
- Services: `automation.trigger(skip_condition: bool, default true)`, `automation.turn_on`, `automation.turn_off(stop_actions: bool)`, `automation.toggle`, `reload`. Toggle yes (enable/disable). Primary tile action: trigger (or toggle enable).
- Color generic amber when on. Icon mdi:robot (off mdi:robot-off, unavailable mdi:robot-confused).

### button
- State: ISO timestamp of last press or `unknown`. device_class `identify|restart|update`. Service `button.press`. Icons `_` mdi:button-pointer; identify mdi:crosshairs-question; restart mdi:restart; update mdi:package-up.

### input_button
- State: last-press timestamp. Services `input_button.press`, `reload`. Icon mdi:button-pointer.

### input_number
- State: numeric string. Attributes: `min`, `max`, `step`, `mode` (`slider|box`), `unit_of_measurement`, `initial`, `editable`.
- Services: `input_number.set_value(value)`, `increment`, `decrement`, `reload`. Icon fallback mdi:ray-vertex.

### number
- State numeric. Attributes: `min`, `max`, `step`, `mode` (`auto|box|slider`), `unit_of_measurement`, `device_class` (same list as sensor numeric subset; icons per class e.g. temperature mdi:thermometer, humidity mdi:water-percent, battery mdi:battery, power mdi:flash). Service `number.set_value(value)`. Default icon mdi:ray-vertex.

### input_select
- State: selected option. Attributes: `options` (list), `initial`, `editable`. Services: `select_option(option)`, `select_next(cycle)`, `select_previous(cycle)`, `select_first`, `select_last`, `set_options(options)`, `reload`. Icon fallback mdi:format-list-bulleted.

### select
- State: current option. Attributes: `options`. Services: `select.select_option(option)`, `select_next(cycle)`, `select_previous(cycle)`, `select_first`, `select_last`. Icon mdi:format-list-bulleted.

### input_text
- State: string. Attributes: `min`, `max` (length), `pattern`, `mode` (`text|password`), `initial`, `editable`. Service `input_text.set_value(value)`, `reload`. Icon fallback mdi:form-textbox.

### text
- State string. Attributes `min`, `max`, `mode` (`text|password`), `pattern`. Service `text.set_value(value)`. Icon mdi:form-textbox.

### input_datetime
- State: `YYYY-MM-DD`, `HH:MM:SS`, or `YYYY-MM-DD HH:MM:SS` depending on config. Attributes: `has_date`, `has_time`, `editable`, `year, month, day, hour, minute, second, timestamp`, `initial`.
- Service `input_datetime.set_datetime(date | time | datetime | timestamp)`, `reload`. Icon mdi:calendar-clock.

### date / time / datetime
- `date`: state `YYYY-MM-DD`, service `date.set_value(date)`, icon mdi:calendar.
- `time`: state `HH:MM:SS`, service `time.set_value(time)`, icon mdi:clock.
- `datetime`: state ISO 8601 UTC timestamp, service `datetime.set_value(datetime)`, icon mdi:calendar-clock. `datetime` is a timestamp-state domain (active unless unavailable).

### sensor
- State: value string (numeric if unit/state_class set; `enum` = one of attribute `options`; `timestamp`/`date` ISO strings). Attributes: `unit_of_measurement`, `device_class`, `state_class`, `options` (enum), `suggested_display_precision`. `unknown` shown as "Unknown", `unavailable` as "Unavailable".
- No services. Tile: show value + unit (+ sparkline from history for numeric).
- Not state-colored (only battery numeric: green >=70 / orange >=30 / red <30). Default icon `_` mdi:eye (enum mdi:eye). Icons by device class are in §3.2.
- `state_class` (`SensorStateClass`): `measurement` (instantaneous value, statistics mean/min/max), `measurement_angle` (degrees, circular mean), `total` (cumulative that may go up/down or reset; statistics sum, use with `last_reset` or monotonic), `total_increasing` (monotonic counter, resets to 0 detected as a reset; statistics sum). Only numeric states with a state_class are charted as long-term statistics; sparkline for `measurement` = line; `total*` = bar/step of change.

### binary_sensor
- State `on`/`off`. Attributes `device_class`. No services. Display text and icons by class: §3.1. Active color: amber for `on` unless class in red list (battery, carbon_monoxide, gas, glass_break, heat, lock, moisture, problem, safety, smoke, sound, tamper → red). Default icon `_` off mdi:radiobox-blank, on mdi:checkbox-marked-circle.

### event
- State: ISO timestamp of last event (or `unknown`). Attributes: `event_type` (last), `event_types` (list), plus event-specific data. device_class `button|doorbell|motion`. No services (fires). Icons: `_` mdi:eye-check, button mdi:gesture-tap-button, doorbell mdi:doorbell, motion mdi:motion-sensor. Timestamp-state domain.

### update
Source: core `update/const.py`, services.yaml.
- State: `on` (update available), `off` (up to date). Attributes: `installed_version`, `latest_version`, `skipped_version`, `title`, `release_summary`, `release_url`, `in_progress` (bool or int percent), `update_percentage`, `auto_update`, `display_precision`. device_class `firmware`.
- FEAT `UpdateEntityFeature`: `INSTALL=1, SPECIFIC_VERSION=2, PROGRESS=4, BACKUP=8, RELEASE_NOTES=16`.
- Services: `update.install(version?, backup?)`, `update.skip`, `update.clear_skipped`. Release notes via WS `update/release_notes`.
- Color `--state-update-active-color` orange when `on`. Icon mdi:package-up (off mdi:package); button device_class update mdi:package-up.

### weather
Source: core `weather/const.py`.
- State (condition): `clear-night, cloudy, exceptional, fog, hail, lightning, lightning-rainy, partlycloudy, pouring, rainy, snowy, snowy-rainy, sunny, windy, windy-variant`.
- Attributes: `temperature`, `temperature_unit`, `apparent_temperature`, `dew_point`, `humidity`, `pressure`, `pressure_unit`, `wind_speed`, `wind_speed_unit`, `wind_gust_speed`, `wind_bearing` (deg or text), `visibility`, `visibility_unit`, `precipitation_unit`, `ozone`, `cloud_coverage`, `uv_index`. Forecast attributes removed; use action `weather.get_forecasts(type: daily|hourly|twice_daily)` (response data, `entity_id` keyed `forecast` list with `datetime, condition, temperature, templow, precipitation, precipitation_probability, wind_speed, ...`).
- FEAT `WeatherEntityFeature`: `FORECAST_DAILY=1, FORECAST_HOURLY=2, FORECAST_TWICE_DAILY=4`.
- Color per `--state-weather-<state>-color` (list in §1.3). Icons: `_` mdi:weather-partly-cloudy (partlycloudy), clear-night mdi:weather-night, cloudy mdi:weather-cloudy, exceptional mdi:alert-circle-outline, fog mdi:weather-fog, hail mdi:weather-hail, lightning mdi:weather-lightning, lightning-rainy mdi:weather-lightning-rainy, pouring mdi:weather-pouring, rainy mdi:weather-rainy, snowy mdi:weather-snowy, snowy-rainy mdi:weather-snowy-rainy, sunny mdi:weather-sunny, windy mdi:weather-windy, windy-variant mdi:weather-windy-variant.

### person
- State: `home`, `not_home`, or a zone name (e.g. `work`). Attributes: `id`, `user_id`, `device_trackers` (list), `source` (the tracker used), `latitude`, `longitude`, `gps_accuracy`, `entity_picture`. No services. Active != `not_home`. Color home green, other active blue, not_home inactive. Icon mdi:account (not_home mdi:account-arrow-right).

### device_tracker
- State `home`, `not_home`, zone name (or `unknown`). Attributes: `source_type` (`gps|router|bluetooth|bluetooth_le`), `latitude`, `longitude`, `gps_accuracy`, `battery_level`, `in_zones` (new), scanner: `ip`, `mac`, `host_name`. Services: `device_tracker.see` (legacy). Same colors/icons as person.

### zone
- State: number of persons currently in the zone (string int). Attributes: `latitude`, `longitude`, `radius` (m), `passive` (bool), `persons` (list), `editable`. No control services (`zone.reload`). Icon: per-zone `icon` or fallback mdi:map-marker-radius.

### sun
- State: `above_horizon`, `below_horizon`. Attributes: `next_dawn`, `next_dusk`, `next_midnight`, `next_noon`, `next_rising`, `next_setting` (ISO), `elevation` (deg), `azimuth` (deg), `rising` (bool). No services. Color above amber, below indigo. Icon fallback mdi:white-balance-sunny.

### siren
- State on/off. Attributes: `available_tones` (list or dict). FEAT `SirenEntityFeature`: `TURN_ON=1, TURN_OFF=2, TONES=4, VOLUME_SET=8, DURATION=16`.
- Services: `siren.turn_on(tone, volume_level, duration)`, `turn_off`, `toggle`. Color `--state-siren-active-color` red. Icon mdi:bullhorn.

### remote
- State on/off. Attributes: `activity_list`, `current_activity`. FEAT `RemoteEntityFeature`: `LEARN_COMMAND=1, DELETE_COMMAND=2, ACTIVITY=4`.
- Services: `remote.turn_on(activity)`, `turn_off`, `toggle`, `send_command(device, command, num_repeats, delay_secs, hold_secs)`, `learn_command(...)`, `delete_command(...)`. Icon mdi:remote (off mdi:remote-off).

### todo
- State: count of incomplete (`needs_action`) items (int string). FEAT `TodoListEntityFeature`: `CREATE_TODO_ITEM=1, DELETE_TODO_ITEM=2, UPDATE_TODO_ITEM=4, MOVE_TODO_ITEM=8, SET_DUE_DATE_ON_ITEM=16, SET_DUE_DATETIME_ON_ITEM=32, SET_DESCRIPTION_ON_ITEM=64`.
- Services: `todo.get_items(status)` (response), `add_item(item, due_date, due_datetime, description)`, `update_item(item, rename, status, due_date, due_datetime, description)` (status `needs_action|completed`), `remove_item(item)`, `remove_completed_items`. Icon mdi:clipboard-list. Items also via WS `todo/item/list`.

### calendar
- State `on` (event active now) / `off`. Attributes: `message`, `all_day`, `start_time`, `end_time`, `location`, `description` (of the current/next event).
- FEAT `CalendarEntityFeature`: `CREATE_EVENT=1, DELETE_EVENT=2, UPDATE_EVENT=4`.
- Services: `calendar.get_events(start_date_time|end_date_time|duration)` (response), `create_event(summary, description, start_date_time, end_date_time, start_date, end_date, in, location)`. REST `GET /api/calendars/<entity>?start=&end=`. Icon mdi:calendar (on mdi:calendar-check, off mdi:calendar-blank).

### timer
- State: `idle`, `active`, `paused`. Attributes: `duration` (HH:MM:SS), `remaining` (when paused), `finishes_at` (when active), `editable`, `restore`, `last_transition`.
- Services: `timer.start(duration?)`, `pause`, `cancel`, `finish`, `change(duration ±)`, `reload`. Active = `active` only. Icon fallback mdi:timer-outline. Events: `timer.finished`, `timer.cancelled`.

### counter
- State: integer string. Attributes: `initial`, `step`, `minimum`, `maximum`, `editable`. Services: `counter.increment`, `decrement`, `reset`, `set_value(value)`, `reload`. Icon fallback mdi:counter.

### group
- State depends on members (`on/off`, `home/not_home`, `open/closed`, `locked/unlocked`, `problem/ok`…; with `all: true` requires all). Attributes: `entity_id` (members), `order`, `all`. Active states: `on, home, open, locked, problem`. Colored using common member domain. Toggle: yes (`group.*` in DOMAINS_TOGGLE; `homeassistant.turn_on/off/toggle` applied to members). Icon fallback mdi:google-circles-communities. Services `group.set`, `group.remove`, `group.reload`.

### notify (if relevant)
- Not a state entity in most setups. Legacy `notify.<service>(message, title, data, target)`; modern entity-based `notify` entities (state = last sent timestamp) with `notify.send_message(message, title)`. Dashboard use: low value. Icon mdi:message (fe fallback mdi:comment-alert). Timestamp-state domain.

---

## 3. Device classes

### 3.1 binary_sensor — display text on/off, icon off/on (core `binary_sensor/strings.json`, `icons.json`)
Source: `https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/binary_sensor/{strings,icons}.json`
"normal/closed/…" `[%key:common::state::*%]` placeholders resolved to their English literals.

| device_class | off text | on text | icon off | icon on | on color |
|---|---|---|---|---|---|
| (none) | Off | On | mdi:radiobox-blank | mdi:checkbox-marked-circle | amber |
| battery | Normal | Low | mdi:battery | mdi:battery-outline | red |
| battery_charging | Not charging | Charging | mdi:battery | mdi:battery-charging | amber |
| carbon_monoxide | Clear | Detected | mdi:smoke-detector | mdi:smoke-detector-alert | red |
| cold | Normal | Cold | mdi:thermometer | mdi:snowflake | amber |
| connectivity | Disconnected | Connected | mdi:close-network-outline | mdi:check-network-outline | amber |
| door | Closed | Open | mdi:door-closed | mdi:door-open | amber |
| garage_door | Closed | Open | mdi:garage | mdi:garage-open | amber |
| gas | Clear | Detected | mdi:check-circle | mdi:alert-circle | red |
| glass_break | Clear | Glass break detected | mdi:glass-fragile | (same) | red |
| heat | Normal | Hot | mdi:thermometer | mdi:fire | red |
| light | No light | Light detected | mdi:brightness-5 | mdi:brightness-7 | amber |
| lock | Locked | Unlocked | mdi:lock | mdi:lock-open | red |
| moisture | Dry | Wet | mdi:water-off | mdi:water | red |
| motion | Clear | Detected | mdi:motion-sensor-off | mdi:motion-sensor | amber |
| moving | Not moving | Moving | mdi:octagon | mdi:arrow-right | amber |
| occupancy | Clear | Detected | mdi:home-outline | mdi:home | amber |
| opening | Closed | Open | mdi:square | mdi:square-outline | amber |
| plug | Unplugged | Plugged in | mdi:power-plug-off | mdi:power-plug | amber |
| power | Off | On | mdi:power-plug-off | mdi:power-plug | amber |
| presence | Away | Home | mdi:home-outline | mdi:home | amber |
| problem | OK | Problem | mdi:check-circle | mdi:alert-circle | red |
| running | Not running | Running | mdi:stop | mdi:play | amber |
| safety | Safe | Unsafe | mdi:check-circle | mdi:alert-circle | red |
| smoke | Clear | Detected | mdi:smoke-detector-variant | mdi:smoke-detector-variant-alert | red |
| sound | Clear | Detected | mdi:music-note-off | mdi:music-note | red |
| tamper | Clear | Tampering detected | mdi:check-circle | mdi:alert-circle | red |
| update | Up-to-date | Update available | mdi:package | mdi:package-up | amber |
| vibration | Clear | Detected | mdi:crop-portrait | mdi:vibrate | amber |
| window | Closed | Open | mdi:window-closed | mdi:window-open | amber |

Caveat: `motion/occupancy/smoke/sound/vibration/carbon_monoxide` off/on texts are keyed to the `gas` strings (Clear/Detected). Frontend `--state-binary_sensor-<dc>-on-color` is red only for the classes marked red; other classes use `--state-binary_sensor-active-color` (amber).

### 3.2 sensor — device classes, typical units, default icons
Sources: core `sensor/const.py` (`SensorDeviceClass`, `DEVICE_CLASS_UNITS`), `sensor/icons.json`. Entries marked ◇ are non-numeric. Class default icon from icons.json; unit sets are `UnitOf…` enums in `homeassistant/const.py` (https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/const.py).

| device_class | typical units | icon | typical state_class |
|---|---|---|---|
| absolute_humidity | g/m³, mg/m³ | mdi:water-opacity | measurement |
| apparent_power | mVA, VA, kVA | mdi:flash | measurement |
| aqi | (none) | mdi:air-filter | measurement |
| area | m², cm², km², mm², in², ft², yd², mi², ac, ha | mdi:texture-box | measurement/total |
| atmospheric_pressure | Pa, hPa, kPa, bar, cbar, mbar, mmHg, inHg, psi | mdi:thermometer-lines | measurement |
| battery | % | mdi:battery-* by range (0 battery-alert, 10..90 battery-N, 100 battery); default mdi:battery-unknown | measurement |
| blood_glucose_concentration | mg/dL, mmol/L | mdi:spoon-sugar | measurement |
| carbon_monoxide | ppm, ppb, mg/m³, µg/m³ | mdi:molecule-co | measurement |
| carbon_dioxide | ppm | mdi:molecule-co2 | measurement |
| conductivity | S/cm, µS/cm, mS/cm | mdi:sprout-outline | measurement |
| current | A, mA | mdi:current-ac | measurement |
| data_rate | bit/s…GBit/s, B/s…GiB/s | mdi:transmission-tower | measurement |
| data_size | bit…, B, kB…, KiB… | mdi:database | total / total_increasing |
| date ◇ | ISO date | mdi:calendar | — |
| distance | mm, cm, m, km, in, ft, yd, mi | mdi:arrow-left-right | measurement/total |
| duration | d, h, min, s, ms, µs | mdi:progress-clock | measurement/total |
| energy | Wh, kWh, MWh, GWh, TWh, MJ, GJ, cal… | mdi:lightning-bolt | total / total_increasing |
| energy_distance | kWh/100km, Wh/km, mi/kWh, km/kWh | (default) | measurement |
| energy_storage | Wh, kWh, MWh… | mdi:car-battery | measurement |
| enum ◇ | one of `options` attr | mdi:eye | — |
| frequency | Hz, kHz, MHz, GHz | mdi:sine-wave | measurement |
| gas | m³, ft³, CCF, L | mdi:meter-gas | total / total_increasing |
| humidity | % | mdi:water-percent | measurement |
| illuminance | lx | mdi:brightness-5 | measurement |
| irradiance | W/m², BTU/(h⋅ft²) | mdi:sun-wireless | measurement |
| moisture | % | mdi:water-percent | measurement |
| monetary | ISO 4217 currency code | mdi:cash | total |
| nitrogen_dioxide / nitrogen_monoxide / nitrous_oxide / ozone / sulphur_dioxide | µg/m³ (ppb/ppm where allowed) | mdi:molecule | measurement |
| ph | (none) | mdi:ph | measurement |
| pm1 / pm10 / pm25 / pm4 | µg/m³ | mdi:molecule | measurement |
| power | mW, W, kW, MW, GW, TW | mdi:flash | measurement |
| power_factor | %, (none) | mdi:angle-acute | measurement |
| precipitation | mm, cm, in | mdi:weather-rainy | total / total_increasing |
| precipitation_intensity | mm/h, in/h, mm/d | mdi:weather-pouring | measurement |
| pressure | Pa, hPa, kPa, bar, cbar, mbar, mmHg, inHg, psi | mdi:gauge | measurement |
| radon | Bq/m³, pCi/L | mdi:radioactive | measurement |
| reactive_energy | varh, kvarh | mdi:lightning-bolt | total_increasing |
| reactive_power | var, kvar | mdi:flash | measurement |
| signal_strength | dB, dBm | mdi:wifi | measurement |
| sound_pressure | dB, dBA | mdi:ear-hearing | measurement |
| speed | m/s, km/h, mph, kn, ft/s, in/d, in/h, mm/d, … | mdi:speedometer | measurement |
| temperature | °C, °F, K | mdi:thermometer | measurement |
| temperature_delta | °C, °F, K (relative) | mdi:thermometer | measurement |
| timestamp ◇ | ISO datetime | mdi:clock | — |
| uptime ◇ | ISO datetime of boot | mdi:clock-start | — |
| volatile_organic_compounds | µg/m³, mg/m³ | mdi:molecule | measurement |
| volatile_organic_compounds_parts | ppm, ppb | mdi:molecule | measurement |
| voltage | V, mV, µV, kV, MV | mdi:sine-wave | measurement |
| volume | L, mL, gal, fl. oz., m³, ft³, CCF | mdi:car-coolant-level | total / total_increasing |
| volume_storage | L, mL, gal, m³, ft³ | mdi:storage-tank | measurement |
| volume_flow_rate | m³/h, ft³/min, L/min, gal/min, mL/s | mdi:pipe-valve | measurement |
| water | m³, ft³, CCF, L, gal | mdi:water | total / total_increasing |
| weight | g, kg, mg, µg, oz, lb, st | mdi:weight | measurement |
| wind_direction | ° | mdi:compass-rose; range icons 0→mdi:arrow-down, 22.5→arrow-bottom-left, 67.5→arrow-left, 112.5→arrow-top-left, 157.5→arrow-up, 202.5→arrow-top-right, 247.5→arrow-right, 292.5→arrow-bottom-right, 337.5→arrow-down | measurement_angle |
| wind_speed | m/s, km/h, mph, kn, ft/s | mdi:weather-windy | measurement |

(Typical state_class column is conventional guidance; core only enforces valid units per class.) Frontend sensor domain defaults (`fe-icons`): sensor mdi:eye; temperature mdi:thermometer; humidity mdi:water-percent; illuminance mdi:brightness-6; power mdi:flash; battery mdi:battery.

---

## 4. Domains worth a dashboard tile — primary action

| Domain | Single primary tile action | Service call |
|---|---|---|
| light | toggle (long-press: brightness/color) | `light.toggle` (`brightness_pct`, `color_temp_kelvin`, `rgb_color` on detail) |
| switch / input_boolean / group (on/off) / fan / humidifier / siren / remote | toggle | `<domain>.toggle` |
| automation | trigger (secondary: enable/disable) | `automation.trigger` `{skip_condition: true}` / `automation.toggle` |
| script | run | `script.turn_on` (or `script.<name>` with fields) |
| scene | activate | `scene.turn_on` |
| button / input_button | press | `button.press` / `input_button.press` |
| cover | open / close / stop buttons (+ position slider if SET_POSITION) | `cover.open_cover`/`close_cover`/`stop_cover`/`set_cover_position` |
| valve | open/close toggle | `valve.toggle` / `open_valve`/`close_valve` |
| lock | lock / unlock (code if `code_format`) | `lock.lock` / `lock.unlock` |
| climate | target temp +/- and hvac mode | `climate.set_temperature`, `climate.set_hvac_mode` |
| water_heater | target temp +/- and operation mode | `water_heater.set_temperature`, `set_operation_mode` |
| media_player | play/pause (+ prev/next, volume) | `media_player.media_play_pause` |
| vacuum | start / return to base | `vacuum.start` / `vacuum.return_to_base` (`pause`, `locate`) |
| lawn_mower | start mowing / dock | `lawn_mower.start_mowing` / `dock` |
| alarm_control_panel | arm (home/away…) / disarm, prompt for code per `code_format` / `code_arm_required` | `alarm_control_panel.alarm_arm_*` / `alarm_disarm` |
| number / input_number | slider/stepper | `number.set_value` / `input_number.set_value` |
| select / input_select | dropdown | `select.select_option` / `input_select.select_option` |
| text / input_text | text field | `text.set_value` / `input_text.set_value` |
| date / time / datetime / input_datetime | picker | `<domain>.set_value` / `input_datetime.set_datetime` |
| timer | start / pause / cancel | `timer.start` / `pause` / `cancel` |
| counter | increment | `counter.increment` (`decrement`, `reset`) |
| update | install (if INSTALL) | `update.install` |
| todo | add item (list shown) | `todo.add_item` |
| camera / image | show snapshot/stream (no control) | `/api/camera_proxy/<id>`; optional `camera.turn_on/off` |
| sensor | none — value + unit (+ sparkline for numeric with state_class) | — |
| binary_sensor | none — status chip with device-class text/icon | — |
| weather, sun, person, device_tracker, zone, calendar, event | none — display only | — |
