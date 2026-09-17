# Utility and time

## Capture completeness

- Board: `widget-ui-audit-utility` at `http://localhost:3001/boards/widget-ui-audit-utility`.
- Authenticated demo capture on the seeded SQLite database; 12 columns and all ten requested sizes are represented once for each of `clock`, `weather`, `airQuality`, `countdown`, and `timer` (50 widgets per viewport).
- `desktop-1080p`, `desktop-1440p`, and `macbook-pro` each captured 50/50 ready widgets, with 0 widget errors and 0 layout overlaps. The manifest contains 153 PNGs: 50 widget crops plus one full-board image for each viewport.
- The MacBook viewport is configured at DPR 2; its 1x1 crop is 246x246 and the captured larger crops preserve their intended card geometry.

## UI observations

- The 1x1 clock crop is legible and centered with only the current time (`23:03` in the inspected frame). The 5x5 timer crop keeps `FOCUS` and `25:00` centered while leaving substantial empty space; play/restart controls and the progress track stay anchored along the bottom edge.
- Weather stays compact at 1x1 with temperature, condition, and high/low values; larger sizes add the city label (`Paris`). Air quality shows `39 / Fair` at 1x1 and adds the six-hour AQI trend at larger sizes.
- Countdown shows `New year 2030` and the remaining days/hours at 1x1; larger sizes add the target date and time plus the progress bar. The timer fixture is idle at 25:00 and was not started during capture.

## Data limitations

- Weather and air quality use Paris public/demo-backed data, so values and availability can change between captures. Countdown and timer values are seeded fixtures; timer controls were left idle.
