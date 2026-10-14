# 72: Weather, air quality and stocks

**What to build:** Search a location or symbol, persist weather/AQI/forecast/stock choices and render meaningful units/charts with exact-input refresh; supply Clock's weather/location service.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 20 options validate/convert/save/reload, including coordinates and symbol/range/interval; city lookup and weather temperature/speed/decimals/date/humidity/wind/forecast/icons remain usable in compact/advanced views and Clock's consumer.
- [ ] AQI standard, UV/pollutants/pollen and stock details/chart state distinguish missing/null observations from zero; changed location/symbol/range gets its own actual procedure/input/key, not another instance's data.
- [ ] Preserve or explicitly approve changes to weather 600s polling/300s stale/server-cache/10s deadline, AQI 900s cache/polling/24h stale allowance/10s deadline and stocks no-root-poll; display fresh observations versus permitted stale forecasts honestly and reconcile demo/manual refresh.
- [ ] Standalone upstream services remain server-only and bounded; saved/preview input policy, ordinary-error stale retention, forbidden/session clearing and approved request-local hydration/client chart loading avoid duplicate requests. Record future focused coordinates/units/null/conversion/same-kind query and timeout recovery evidence at scoped target gates.

## Coverage

`weather` (11): `isFormatFahrenheit`, `disableTemperatureDecimals`, `animateIcons`, `showHumidity`, `showCurrentWindSpeed`, `useImperialSpeed`, `location`, `dateFormat`, `showCity`, `hasForecast`, `forecastDayCount`; `airQuality` (5): `location`, `aqiStandard`, `showUv`, `showPollutants`, `showPollen`; `stockPrice` (4): `stock`, `timeRange`, `timeInterval`, `showDetails`. Primary `location` input; consumes `text`, `switch`, `select`, `slider`. Primary leaves `location.searchCity`, `widget.weather.atLocation`, `widget.airQuality.atLocation`, `widget.stockPrice.getPriceHistory`. No ordinary IntegrationKind selection; #69 consumes location/weather.

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md), [environment evidence](../drafts/widgets.md#widget-environment--location-aware-weatheraqi-and-stock-charts).

## Required contracts

Initially unaccepted: #03 bounded cache/deadline/generation port; #04 standalone saved/preview policy; #67 query/status/host; #68 option validation/editor; #27/#28 placement/focus/save effects; #07 locale/units/time; #120 typed DTO/errors. #69 accepts the narrow weather/location handoff. Real upstream/service/hydration joins are later evidence; all-provider completion is unnecessary.

## Decision holds

Q11/Q12 concrete option conversion; Q13 affected saves. Detailed locale/time basis, standalone networking/preview policy, selective SSR and freshness/demo override are unsettled; inherited durations are source evidence, not approval for an unreviewed cache redesign.

## Ownership

#72 owns standalone location/weather/AQI/stock services, selector, charts and Clock handoff. #03 owns backing primitives; #68 option service; #29 placement. No generic integration/provider rewrite or root installation here; COMPOSITION and exclusive local allocations govern shared files.
