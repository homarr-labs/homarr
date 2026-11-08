# Home Assistant widgets: UX and demand research

Date: 2026-11-06. Sources: GitHub issues/discussions via `gh`, project docs and source (URLs inline).

Coverage notes:

- `ajnart/homarr` has issues disabled (`gh` errors), so its old issues (#1848, #2070, referenced by newer issues) could not be read. Only old-repo discussions were searchable.
- No Home Assistant-specific issue or discussion was found for Flame, Heimdall, Organizr, Hubitat or Dashy (Dashy: no HA hit in [docs/widgets.md](https://github.com/Lissy93/dashy/blob/master/docs/widgets.md)). Organizr and Hubitat were not investigated further.
- Many closed Homarr issues below were closed by an automated cleanup ("Zero-comment enhancement request with no maintainer engagement"), not because they were implemented. Treat "closed" as "not built", not "done".

## 1. Homarr user demand

### 1.1 Relevant issues and discussions (homarr-labs/homarr unless noted)

| #                                                                                  | Title                                                           | State                | Ask (1 line)                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#6570](https://github.com/homarr-labs/homarr/issues/6570)                         | bug: Home Assistant integration seems with issues               | closed               | Entity toggle took ~30 s to reflect; Execute Automation click did nothing in HA. Fixed for Entity State by PR #6571 (reporter confirmed); Execute Automation still reported not working with a numeric automation ID.                                                                                                |
| [#2003](https://github.com/homarr-labs/homarr/issues/2003)                         | bug: entity state and execute automation cards aren't movable   | closed               | Cards with an HA integration can't be dragged.                                                                                                                                                                                                                                                                       |
| [#3614](https://github.com/homarr-labs/homarr/issues/3614)                         | feat(entity-state): value transformations                       | closed (cleanup)     | Format state by `device_class` (e.g. `timestamp` shown raw).                                                                                                                                                                                                                                                         |
| [#3616](https://github.com/homarr-labs/homarr/issues/3616)                         | feat: add home assistant historical data                        | closed (cleanup)     | Graph of an entity's history via REST API.                                                                                                                                                                                                                                                                           |
| [#3617](https://github.com/homarr-labs/homarr/issues/3617)                         | feat: add home assistant calendar                               | closed (0 comments)  | Show HA calendar entities (`/api/calendars/<id>`).                                                                                                                                                                                                                                                                   |
| [#3756](https://github.com/homarr-labs/homarr/issues/3756)                         | feat(entity-state): show attribute of entity                    | closed (cleanup)     | Show any attribute instead of state (originally ajnart/homarr#2070).                                                                                                                                                                                                                                                 |
| [#5650](https://github.com/homarr-labs/homarr/issues/5650)                         | feat: entity state classes for dynamic CSS                      | closed (implemented) | Expose state as class/data attribute so lights can be coloured on/off; reporter confirmed it works.                                                                                                                                                                                                                  |
| [#3512](https://github.com/homarr-labs/homarr/issues/3512)                         | feat: Homey API integration                                     | open                 | Request for a different smart-home hub (Homey): devices, capabilities, flows.                                                                                                                                                                                                                                        |
| [#3709](https://github.com/homarr-labs/homarr/issues/3709)                         | feat: Homeassistant Addon                                       | closed               | Run Homarr as an HA OS add-on (a community add-on exists).                                                                                                                                                                                                                                                           |
| [Discussion #6744](https://github.com/homarr-labs/homarr/discussions/6744)         | SKYNET // COMMAND NEXUS: Homarr v2 as a live HA command cockpit | open                 | User built a Custom Widget V2 cockpit: thermal telemetry (current/target temp, humidity, HVAC mode/action), media state, UNAVAILABLE shown honestly, confirmation-gated commands, "refresh house" button because command result outruns telemetry refresh. Used a local adapter so no token/entity IDs reach Homarr. |
| [Discussion ajnart/homarr#1764](https://github.com/ajnart/homarr/discussions/1764) | Adding Iframe of Grafana / Homeassist                           | closed               | Old-era workaround: iframe HA into the dashboard.                                                                                                                                                                                                                                                                    |

Searches for "home assistant", "homeassistant", "smart home", "hass", "entity state", "automation" across homarr-labs/homarr issues found no other HA-specific feature requests (many hits were unrelated). Demand evidence is therefore thin in volume but consistent in kind.

### 1.2 Clustered, ranked feature requests

| Rank | Feature                                                                     | Evidence                                  |
| ---- | --------------------------------------------------------------------------- | ----------------------------------------- |
| 1    | Reliable, fast control (toggle feedback, automation trigger actually works) | #6570                                     |
| 2    | State-driven visual feedback (colour/style by on/off)                       | #5650 (shipped and confirmed useful)      |
| 3    | Show attributes, not only state                                             | #3756                                     |
| 4    | Value formatting by device_class/unit (timestamps, units)                   | #3614                                     |
| 5    | Sensor history graph                                                        | #3616                                     |
| 6    | Climate/media telemetry plus commands in one panel                          | Discussion #6744 (custom-built, so a gap) |
| 7    | Honest unavailable/degraded state; confirm-before-actuate; manual refresh   | Discussion #6744                          |
| 8    | Calendar entities                                                           | #3617                                     |
| 9    | Drag/move reliability on HA cards                                           | #2003                                     |
| 10   | Other hubs (Homey)                                                          | #3512                                     |

Not requested anywhere in found issues: sliders, camera, areas, scenes/scripts, entity picker, alarm panel. Their inclusion below rests on competitor and HA-card evidence, not Homarr demand. Live updates are likewise not requested for HA specifically; #6744 shows the pain (stale telemetry after commands).

### 1.3 Bugs and complaints about the current integration

- Slow toggle (~30 s) and silent automation failure: [#6570](https://github.com/homarr-labs/homarr/issues/6570). Entity State fixed via PR #6571; Execute Automation follow-up reported.
- Drag-and-drop broken on HA cards: [#2003](https://github.com/homarr-labs/homarr/issues/2003).
- State is only text; no styling hook (resolved in #5650).
- Current docs ([entity-state](../../../apps/docs/docs/widgets/smart-home-entity-state/index.mdx)): "arbitrary attributes are not exposed"; one entity per widget; execute-automation is one automation per widget.

## 2. Competitors

| Project                                                                                                                                                                                                                                                                                                                     | HA support                                                                                                                                                                  | What it shows                                                                                                       | Controls                                  | Templates/custom                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Homepage](https://github.com/gethomepage/homepage/blob/main/docs/widgets/services/homeassistant.md) (source: [proxy.js](https://github.com/gethomepage/homepage/blob/main/src/widgets/homeassistant/proxy.js), [component.jsx](https://github.com/gethomepage/homepage/blob/main/src/widgets/homeassistant/component.jsx)) | Dedicated widget, long-lived token                                                                                                                                          | Fixed fields `people_home`, `lights_on`, `switches_on` ("X / total"), or up to 4 `custom` items; refresh every 60 s | None (read-only)                          | Yes: `state` + `label`/`value` with `{attributes.x}`/`{state}` interpolation (defaults `{attributes.friendly_name}` and `{state} {attributes.unit_of_measurement}`); or Jinja `template` via HA `/api/template` |
| Homer ([docs](https://github.com/bastienwirtz/homer/blob/main/docs/customservices.md))                                                                                                                                                                                                                                      | Smart card `HomeAssistant`                                                                                                                                                  | Instance name, version, entity count (`items`)                                                                      | None                                      | No; needs CORS config in HA                                                                                                                                                                                     |
| Glance ([config docs](https://github.com/glanceapp/glance/blob/main/docs/configuration.md), Custom API section)                                                                                                                                                                                                             | No dedicated HA widget found                                                                                                                                                | Via generic Custom API widget only                                                                                  | None                                      | Generic templating                                                                                                                                                                                              |
| Dashy                                                                                                                                                                                                                                                                                                                       | No HA widget found in widgets.md                                                                                                                                            | n/a                                                                                                                 | n/a                                       | n/a                                                                                                                                                                                                             |
| Flame, Heimdall                                                                                                                                                                                                                                                                                                             | No HA issues/features found                                                                                                                                                 | Link launchers                                                                                                      | n/a                                       | n/a                                                                                                                                                                                                             |
| Homarr (current)                                                                                                                                                                                                                                                                                                            | Integration + 2 widgets (+ Statistics counts per [docs](../../../apps/docs/docs/integrations/home-assistant/index.mdx): total/unavailable entities, lights on, people home) | Single entity state, advanced view with metadata                                                                    | Toggle one entity, trigger one automation | None                                                                                                                                                                                                            |

Takeaways:

- Homepage's value is summary counts ("3/12 lights on") and label/value templates with attribute interpolation. Homarr lacks both attribute display and templates.
- Nobody else offers controls, so Homarr already leads there; the gap is richness, not control.
- Glance has an open request for live updates without reload ([glance#1042](https://github.com/glanceapp/glance/issues/1042)), a general dashboard expectation.

## 3. HA's own and community cards: UX patterns

### 3.1 Tile card features ([card features](https://www.home-assistant.io/dashboards/features/), [tile card](https://www.home-assistant.io/dashboards/tile/))

| Domain        | Features offered                                                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Light         | brightness slider, colour, colour temp, colour favorites, effect                                                                                                      |
| Cover / valve | open/close, position, tilt, tilt position, favorite positions                                                                                                         |
| Climate       | HVAC modes, target temperature, fan/preset/swing modes                                                                                                                |
| Fan           | speed, oscillate, direction, preset modes                                                                                                                             |
| Humidifier    | toggle, modes, target humidity                                                                                                                                        |
| Vacuum        | commands, fan speed                                                                                                                                                   |
| Lock          | lock/unlock commands, open door                                                                                                                                       |
| Alarm panel   | alarm modes                                                                                                                                                           |
| Media player  | playback controls, volume slider/buttons, source, sound mode                                                                                                          |
| Other         | select options, numeric input, counter actions, update actions, lawn mower commands, date, area control, trend graph, bar gauge, temperature forecast, toggle, button |

Tile card shows a badge for some domains (climate, person), supports tap actions and a `features_position` (`bottom` or `inline`); `inline` puts the first feature beside the name.

### 3.2 Other HA cards

| Card                                                                                    | Purpose ([docs](https://www.home-assistant.io/dashboards/))                                                      |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Area                                                                                    | "control of your entities in a specified area"                                                                   |
| Glance                                                                                  | "group multiple sensors in a compact overview"                                                                   |
| Thermostat                                                                              | change temperature and mode of climate/water heater                                                              |
| History graph                                                                           | graph per listed entity                                                                                          |
| Statistic                                                                               | statistical value for an entity                                                                                  |
| Picture glance                                                                          | image with entity icons; toggles on the right, others open more-info                                             |
| Media control, Weather forecast, Entities, Alarm panel, Light, Gauge, Calendar, Logbook | standard set                                                                                                     |
| Sections view                                                                           | cards organised in grid sections ([docs](https://www.home-assistant.io/dashboards/sections/)); default view type |
| Badges                                                                                  | can now wrap or scroll ([2025.5 release notes](https://www.home-assistant.io/blog/2025/05/07/release-20255/))    |
| Entity pickers                                                                          | show device and area name (same release)                                                                         |

### 3.3 Community cards

- [Mushroom](https://github.com/piitaya/lovelace-mushroom): alarm, chips, climate, cover, entity, fan, humidifier, light, lock, media, number, person, select, template, title, update, vacuum cards; visual editor, icon and colour pickers, Material colours, light/dark. Chips card = "small information at the top of your dashboard" (summary indicators, action chips).
- [Bubble Card](https://github.com/Clooos/Bubble-Card): pop-ups, horizontal button stack, button, media player, cover, select, climate, calendar, separator, sub-buttons, conditions, tap/double-tap/hold actions, templates, modules.

### 3.4 Design patterns to borrow

Observations from the docs above (pattern names are my synthesis):

- One tile per entity, domain decides the controls (slider for light/cover, mode chips for climate, transport buttons for media). Tap toggles; secondary affordance opens details.
- Colour encodes state (active tile/icon coloured, inactive muted); coloured icon background circle; tile `color` option.
- Compact summary chips/badges on top ("lights on", people home, alerts) that act as filters or links.
- Grouping by area/section with a heading; area card aggregates controls.
- Inline vs bottom control placement to fit small tiles.
- Domain-aware formatting (units, timestamps, device_class) and friendly names by default.
- Unavailable shown as its own state, not as off (also demanded in #6744).

## 4. Recommended feature list for a Homarr HA widget set

### MUST (direct demand or fixes a reported failure)

| Feature                                                                                                                                   | Justification                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Reliable, fast actions with visible success/failure; Execute Automation works with entity ID (`automation.x`) and clear errors            | #6570                                                                   |
| State-aware styling: active/inactive/unavailable colour on icon and tile, plus the CSS hook kept                                          | #5650; HA tile patterns                                                 |
| Display any attribute, with unit and device_class-aware formatting (timestamps, numbers)                                                  | #3756, #3614; Homepage `{attributes.x}` templates                       |
| Explicit unavailable/unknown state and "last updated"/refresh                                                                             | Discussion #6744                                                        |
| Domain-aware controls for core domains: light (toggle + brightness), switch, cover (open/close/position), scene/script/automation trigger | HA tile feature list; #6570; scenes/scripts are inferred, not requested |
| Drag/move works on all HA widgets                                                                                                         | #2003                                                                   |

### SHOULD

| Feature                                                                          | Justification                                                                                                               |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Multi-entity widget (tile grid or list) so users don't add one widget per entity | Competitors (Homepage up to 4 custom items) and HA entities/glance cards; a consequence of one-entity limit in current docs |
| Summary chips ("X lights on", people home, unavailable count)                    | Homepage fields; Mushroom chips; existing Statistics counts                                                                 |
| Climate: current/target temp, HVAC mode, setpoint control                        | Discussion #6744; HA thermostat card                                                                                        |
| Media player: now playing, play/pause, volume                                    | Discussion #6744; HA media card                                                                                             |
| Sensor history sparkline/graph                                                   | #3616; HA history-graph/trend graph                                                                                         |
| Entity picker with search (friendly name, area), icon per entity                 | HA 2025.5 pickers show device/area; no Homarr request found                                                                 |
| Live updates (push/subscription or short polling) after actions                  | #6570 latency; #6744 refresh-after-command; Glance#1042                                                                     |
| Confirmation option for risky actions (locks, scripts)                           | #6744                                                                                                                       |

### COULD

| Feature                                                            | Justification                                |
| ------------------------------------------------------------------ | -------------------------------------------- |
| Area grouping with headings                                        | HA area card and Sections                    |
| Calendar entity list                                               | #3617                                        |
| Templates (`{state}`/`{attributes.x}` label/value, optional Jinja) | Homepage                                     |
| Fan, lock, vacuum, alarm panel controls                            | HA features list; no Homarr demand found     |
| Camera snapshot                                                    | HA picture cards; no Homarr demand found     |
| Slider variants for number/input_number                            | HA numeric input feature                     |
| Other hubs (Homey, openHAB)                                        | #3512 (open); out of scope for HA widget set |
