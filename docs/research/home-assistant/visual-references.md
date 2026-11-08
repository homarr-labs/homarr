# Visual references for Home Assistant widgets

Scope: design/interaction references for reworking Homarr's HA widgets (resizable grid, ~100px 1x1 up to 6x4, Mantine, dark+light). Demand and competitor analysis live in `ux-and-demand.md` and are not repeated here.

Coverage legend: **Verified** = primary source fetched. **Light/unverified** = not fetched this pass; treat as leads only.

---

## 1. Home Assistant frontend (2025-2026) — Verified

### Tile card
Sources: [contributor design](https://contributors.home-assistant.io/design/dashboards/tile-card/), [user docs](https://www.home-assistant.io/dashboards/tile/)
- Icon and its circular background take the **state colour** (amber for light on, or the light's own colour); off/unavailable = gray.
- Two tap targets: icon = quick action (toggle/activate), card body = more-info. Since 2025.3 a circular icon background signals "icon tap performs an action".
- `vertical` layout (icon above name) can shrink to 3 of 12 columns (quarter section).
- `features_position`: bottom, or inline. Only the **first** feature goes inline (keeps single-row height, needs full 12 columns); remaining features go below, 2 per row.
- `state_content`: state, attribute, last_changed (relative/total/date/time/datetime). `hide_state`, `show_entity_picture`.
- 2025.3: hover animation, tap-registered animation, keyboard tab support. 2025.11: flexible names (entity/device/area/floor combos).
- Guidance: short names, 1-2 features per tile.

### Sections view grid
Source: [dashboards design](https://contributors.home-assistant.io/design/dashboards/)
- 12-column grid; section width 320-500px; row height 56px, 8px gap. Tile = 6 columns x 1 row. Each card declares a minimum size.

### Features (bottom/inline controls)
Source: [features](https://www.home-assistant.io/dashboards/features/)
- trend-graph (2025.9; 24h default, 1 sample/5px, else hourly mean), bar-gauge (min/max, battery overview), media playback/volume/source, target-temperature (buttons or slider, low/high for ranges), HVAC/preset/fan modes (icons or dropdown), cover open/close/position/tilt/favorites, light brightness/colour/temp/effect, lock, vacuum, alarm, numeric input, select, toggle, button, timer, temperature-forecast (cool blue to warm red gradient bars), area-controls.

### Area card (2025.7 redesign)
Source: [area card](https://contributors.home-assistant.io/design/dashboards/area-card/)
- `display_type`: picture / camera / icon / compact (compact = tile-sized, icon before name, optionally vertical). 16:9 default aspect.
- `sensor_classes` aggregate (median; sum for power/energy). `alert_classes` show as an icon column over the picture; on compact only the first alert, as a **badge on the icon**. "An empty spot is good news."
- `area-controls` feature: up to 4 toggle buttons (lights/fans/covers). Tap navigates to the area.
- Picture type 6 cols x 2 extra rows; compact 1 row.

### Heading card
Source: [heading card](https://contributors.home-assistant.io/design/dashboards/heading-card/)
- No background/border. Title + subtitle; right-side badges (status, not controls) scroll sideways on overflow; chevron when tappable; titles 1-2 words.

### Sensor card
Source: [sensor card](https://contributors.home-assistant.io/design/dashboards/sensor-card/)
- Large value + sparkline (no axes/labels/tooltip), 24h; min 6x2.

### Thermostat card
Source: [thermostat card](https://contributors.home-assistant.io/design/dashboards/thermostat-card/)
- Dial: orange heat, blue cool, gray off. 12x5 shrinkable to 6x2. A tile with target-temperature feature is the one-row alternative.

### Media control card
Source: [media control card](https://contributors.home-assistant.io/design/dashboards/media-control-card/)
- Artwork right; background from artwork dominant colour with readable text. Container-width adaptation: progress bar hidden <350px, controls hidden <300px. Off = gray with only power button. Title scrolls on hover. Tile + playback feature = compact alternative.

### Control components (measurements)
Source: [controls](https://contributors.home-assistant.io/design/components/controls/)
- Track = 20% tint of colour (30% on circular dial), active part full colour.
- Button 40x40 r8; switch 40 thick r12; slider 40 thick r8 (tooltip only while dragging); select 40 thick r10; more-info vertical slider 130 thick, <=320 tall, r36; **tile feature controls 42px (inline 36px)**.
- Circular slider 320 wide, 24px track, 270 degrees open at bottom, dot handle; focused arc grows 24 to 28px; extra 12px hit area.
- Transitions 180ms ease-in-out (arcs 300ms). Hover tint 20 to 40%. Disabled: switch 50% opacity, number buttons 40%. Focus ring 2px. Slider has ARIA role/valuetext.

### More-info dialogs
- Light ([source](https://contributors.home-assistant.io/design/more-info/light/)): tall vertical slider filling from bottom like a glass, in the light's colour (toned so pale colours stay visible); text "71%"; round mode buttons switch brightness/colour wheel/colour temp with fixed position; unavailable keeps layout with disabled controls; off = empty slider, no handle; on/off-only light = big switch.
- Climate ([source](https://contributors.home-assistant.io/design/more-info/climate/)): dial with coloured action label ("Heating") over large target number with -/+; current temp/humidity small above; mode menus below; ring fills from start when heating, from end when cooling; dual handles for low/high; sends on release, -/+ debounced 1s; gray when off.
- Cover ([source](https://contributors.home-assistant.io/design/more-info/cover/)): vertical slider filled from top; tilt slider with striped slat background; open/stop/close, irrelevant ones disabled; state "Open · 70%".

### Foundations and accessibility
Sources: [foundations](https://contributors.home-assistant.io/design/foundations/), [accessibility](https://contributors.home-assistant.io/design/foundations/accessibility/)
- Roboto; sizes 10/12/14/16/20/24/28/32/40; weights 400/500/700; spacing in 4px steps; radii 4/8/12/16/20/24/28/32/36 + pill/circle.
- Motion: 75/150/250/350ms; `prefers-reduced-motion` collapses to 1ms.
- Palette anchors: primary #009ac7, orange-60 #f36d00, green-60 #00ac49, red-50 #dc3146. Semantic tokens; dark mode auto.
- WCAG 2.2 AA: text 4.5:1, UI/icons 3:1, never colour-only. Target min 24x24 (AAA 44); buttons 40, icon buttons 48. White on the loud warning fill is only 2.21:1 in light mode (3.26:1 on primary) so use the paired "on" tokens. 2px focus ring + 2px offset.

### Empty states
Source: [empty states](https://contributors.home-assistant.io/design/patterns/empty-states/)
- 64px icon in secondary colour, heading + description + optional action, max 500px wide; distinct "nothing yet" vs "no results"; don't show while loading.

### Home / Overview dashboard evolution
Sources: [2025.9](https://www.home-assistant.io/blog/2025/09/03/release-20259/) plus release notes 2025.10-2026.11
- 2025.9 Home dashboard: summaries (lights/climate/security/media), areas, favorites, weather, energy. 2025.10 suggested entities by hour of day. 2025.11 favorites+suggestions merged, areas grouped by floor, separate Lights/Climate/Security dashboards. 2025.12 sidebar, reorder. 2026.1 mobile summary cards on top, Devices page for unassigned. 2026.2 renamed "Overview", default. 2026.5 Maintenance (battery, low highlighted, by area), Security activity with 24h log, shortcut card. 2026.6 card picker "By entity" with live previews. 2026.11 automatic sections.
- Takeaway: HA itself moved toward **summary chips by domain + area cards + favorites**, not per-entity walls.

---

## 2. Apple Home (iOS 16-26) — Verified (no pixel sizes found)
Sources: [Apple support](https://support.apple.com/guide/iphone/control-accessories-iph0a717a8fd/ios), [MacStories](https://www.macstories.net/stories/everything-new-coming-to-the-home-app-in-ios-16-and-macos-ventura/)
- Small tile = single-row rectangle; large = two-row squarish. Tap icon (left) toggles, tap name (right) opens controls.
- Category buttons on top (Lights, Climate, Security, Speakers & TVs, Water) with status text like "3 on".
- Sections: Cameras, Scenes, Favorites, Rooms. Tile type distinguished by shape and colour. Scenes: 100+ icons, 12 colours.
- iOS 26: Liquid Glass bar; "Issues" screen with how long a device has been unresponsive; multi-function accessories as a single tile; 26.1 Tinted option for reduced transparency.
- Borrow: category status strip, icon-toggle/name-open split, "how long unresponsive" for unavailable.

## 3. Google Home (2022-2026) — Verified
Sources: [Oct 2025 redesign](https://blog.google/products-and-platforms/devices/google-nest/google-home-app-gemini-redesign/), [support](https://support.google.com/googlehome/answer/7071794)
- 3 tabs (Home/Activity/Automations). Home tab: Favorites, All devices by room, Cameras, Lighting, Climate, with swipeable chips.
- Favorites: tap toggles, slider for brightness/volume, long-press for full controls, media mini-player, edit/reorder.
- Larger favourites temperature tile with adjust-in-place (2024).
- Borrow: tap=toggle / long-press=detail; inline slider on larger tiles; domain chips.

## 4. Community dashboards
### Mushroom — Verified
[github](https://github.com/piitaya/lovelace-mushroom)
- Cards for alarm, climate, cover, entity, fan, humidifier, light, lock, media, number, select, template, title, update, vacuum, person; **chips** (compact top-of-view summary indicators); Material colours, icon/colour pickers, light/dark.
### Bubble Card — Verified
[github](https://github.com/Clooos/Bubble-Card)
- Pop-ups (hash/state-triggered, swipe/Esc close); horizontal button stack ordered by occupancy; slider buttons (brightness, volume, cover position, fan %, climate temp, read-only battery %); sub-buttons top/bottom with visibility conditions; separators.
- Borrow: the **button as slider** (fill = value) and pop-up for detail.
### Minimalist UI — Verified
[github](https://github.com/UI-Lovelace-Minimalist/UI)
- button-card based, ~20 templates, chips, popups. Seeking maintainers in 2026 (maintenance risk; don't depend on it, borrow look only).
### Dwains Dashboard, Nerwyn Material You, 2025-26 showcases — **Light/unverified**
- Not fetched. Dwains is known for auto-generated room-per-page layout; Material You for dynamic-colour Android-style tiles with big rounded shapes. Verify before citing.

## 5. SmartThings / Homey — **Light/unverified**
- Not fetched. Both use room-grouped device tiles with on/off icon toggles; no specifics claimed.

## 6. Accessibility checklist (from HA foundations)
- Text 4.5:1, icons/controls 3:1; verify amber/yellow "on" states in **light theme** (amber fill with white icon fails: use dark icon or darker amber).
- Never colour-only: pair state colour with text ("On", "Heating", "Unavailable") or icon change.
- Targets >=24px minimum, aim 40px; at 1x1 (~100px) a single whole-tile target is fine.
- Honour `prefers-reduced-motion`; keep transitions 150-250ms.
- Sliders need ARIA slider semantics and value text; focus ring 2px with offset.

---

# Patterns that would make a Homarr HA widget look amazing

Common rules across directions:
- **State colour on the icon + 20% tint track** is the single strongest HA idiom; use Mantine theme colours (amber/orange/blue/green/red), gray for off/unavailable.
- Icon circle = action; body = detail. Unavailable keeps layout, dims to ~50%, shows "Unavailable" text (+ duration if known), never hides.
- Adapt by container width, not breakpoint (HA media card: hide progress <350px, controls <300px).
- Radius 12-16px for tiles, 8px for inner buttons; 4px spacing scale; 150-250ms transitions.

## Direction A: Tile grid (HA tile card)
- **1x1**: icon circle top, name below (vertical), state as small text; whole tile toggles; long-press/click name = detail.
- **2x2**: 2x2 tiles per 1x1 slot grid; tile with name + state; first feature inline if it is a slider.
- **4x2**: 4 tiles in a row, each with name+state; one inline feature on the active one.
- **6x4**: 3 columns x 4 rows of wide tiles with bottom features (brightness slider, HVAC modes, trend graph).
- Affordance: icon tap = toggle; body = popover.
- Colour: icon + circle take state colour.
- Borrow: HA tile card, features, heading card for group titles.

## Direction B: Room cards (area card)
- **1x1**: compact area: room icon, name, one alert badge (empty = fine).
- **2x2**: area compact+: name, median temp/humidity, up to 2 toggle buttons.
- **4x2**: picture/icon area card, sensors row, up to 4 area-controls toggles.
- **6x4**: grid of 2-3 room cards, plus alert column.
- Affordance: toggle buttons per domain; tap navigates/expands.
- Colour: lit-up count tints the card; alerts in red/orange.
- Borrow: HA area card, Apple room sections, Google "All devices by room".

## Direction C: Dense control list
- **1x1**: not suitable; collapse to a summary chip ("5 on").
- **2x2**: 4 rows, icon + name + toggle switch.
- **4x2**: 2 columns of rows with inline state text and small sliders (Bubble slider style).
- **6x4**: sorted list grouped by domain with heading rows, last_changed relative time, search/filter.
- Affordance: row switch; row slider (fill = value).
- Colour: left icon tinted; unavailable rows gray with duration.
- Borrow: Bubble Card slider buttons, HA heading card, Mushroom entity rows.

## Direction D: Ambient / glanceable
- **1x1**: one big number or state (temp, "3 on"), tinted background by status.
- **2x2**: summary chips row (Lights 3 on, Climate 21 degrees, Security armed) plus one sparkline.
- **4x2**: chip strip (Apple category buttons / Google chips) + sensor card sparkline.
- **6x4**: Overview-style: summaries on top, battery/maintenance list with low highlighted, 24h activity.
- Affordance: chips tap to filter/expand; mostly read-only.
- Colour: green/ok, orange/attention, red/problem; quiet when fine.
- Borrow: HA Overview + Maintenance, Apple category strip + Issues, sensor card sparkline.

## Direction E: Rich controls (skeuomorphic)
- **1x1**: single large icon with ring fill showing value (e.g. brightness arc).
- **2x2**: circular dial (270 degree arc, target number, -/+) for thermostat, or vertical glass slider for a light.
- **4x2**: media control with artwork-derived background, transport buttons, volume; thermostat dial + mode buttons.
- **6x4**: dial + HVAC/fan modes + trend graph; or media with queue/source.
- Affordance: drag arc/slider (send on release), -/+ debounced 1s.
- Colour: heat orange / cool blue ring, light's own colour in slider, artwork dominant colour for media.
- Borrow: HA thermostat/media/more-info light and climate, Apple/Google detail pages.

Recommendation: ship A as the default view with D-style summary chip strip on top at >=4x2, and offer E controls as the expanded detail (popover/modal) rather than inline; B and C as selectable layouts.
