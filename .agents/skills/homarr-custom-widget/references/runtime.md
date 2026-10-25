# Runtime

Loads read `data.requestId`/`status.requestId` with RefreshButton `requestId` (never `request`); omit it to refresh all loads.
Installation config is `options.name`;
temporary controls use `inputs.name`. Manual SubFetch results stay in its child callback, never data/status.
Status is `{ loading, ok, status, statusText, error }`; test `status.requestId?.ok === false` for errors.

`bind` is temporary; manual request values go in `params` and map to `$param`:

```jsx
<TextInput bind="search" label="Search" />
<NumberInput bind="page" label="Page" defaultValue={1} resetKey={inputs.search} min={1} />
<SubFetch requestId="search" trigger="manual" params={{ query: inputs.search ?? "", page: inputs.page ?? 1 }}>
  {(result) => <Stack>{(result.results ?? []).map(item => <Text key={item.id}>{item.name}</Text>)}</Stack>}
</SubFetch>
```

Manual queries require `trigger: "manual"` on request and SubFetch. `triggerContent` plus `triggerAriaLabel` makes a launcher
already wrapped in a button: use non-interactive content, never Button/Anchor/controls. SubFetch owns loading/error/retry;
its child receives success plus `{ ok, status, statusText, loading: false }`. Never author onClick/fetch callbacks.

`SubFetch`, `ActionButton`, and `ToggleSwitch` need literal `requestId`; validation rejects missing/computed IDs.

`ActionButton`/`ToggleSwitch` publish responses to local data.requestId/status.requestId only after explicit invocation.
Guard the initial state; responses are not persisted across reloads and actions never run automatically.

SubFetch/ActionButton params must contain exactly the names referenced by $param or {param:name}, with valid primitive values,
never undefined/null. Omitted optional query fields need separate verified request variants; empty strings require API support.
Validate nonblank optional inputs against documented formats; show field-level feedback and block requests while invalid.
Never silently omit or forward invalid values.
Fixed query values belong in requests.<id>.query, not params. Test the same names/values the JSX supplies.
When a manual SubFetch ID, params, or definition changes, Homarr hides the prior result and returns to the trigger; new params fetch only after triggering again.

Load `q` with response body `B` -> `data.q === B`; `q=events`/`B={"events":[...]}` -> `data.events.events`.
Manual SubFetch receives B as result. Preserve envelopes; compare paths with preview and revise/retest before persistence.

Safe timestamps: `Date.toLocaleString(value, "en-US", documentedTimezone)`; omit the timezone argument/label if unknown.
UTC needs a documented UTC contract. Also: Date.toISOString/toLocaleDateString/toLocaleTimeString. Countdowns:
`Date.getTime(isoTimestamp) - Date.now()` in milliseconds; no new Date, Date.parse, or invented formatters.
Numbers: `n.toLocaleString("en-US", { maximumFractionDigits: 1, notation: "compact" })`;
style percent/currency/unit (with currency/unit) and signDisplay also work. Preserve units or convert numbers before relabeling.

Guard actual scalar values/types/finite numbers before arithmetic/formatting, not object truthiness. Keep 0/false; empty/missing values show —/No data, never NaN/undefined units. Map cross-collection IDs to verified friendly names or original IDs. Use documented rate semantics (ratio/percent/per-time).

Keep useful data reachable: summaries plus Table/details, working filters, pagination, or a bounded ScrollArea for collections.
Cover requested fields and meaningful observed facts; never silently slice rows. Label partial results and shown/total counts.
Use only verified pagination params/endpoints. Charts need real numeric/category/time series, never invented history/series.
A bounded response-shape summary is not a full schema: inspect omitted
fields when needed, preserve envelopes, and guard heterogeneous items. Keep loading/error/empty/success and narrow/wide states useful.

Verified Mantine 9.6.0: LineChart/AreaChart/BarChart require positive h, data: row[], dataKey: category/time key, series: [{name: actual numeric row key, color: MantineColor}]. Sparkline requires positive h and data: number[]. Use real fields/series; no invented history/formatter callbacks. Other props stay lazy.

Switch/Checkbox defaults use defaultChecked. Dependent pagination uses `defaultValue={1}`/`resetKey={inputs.query}`.

Callback parameters must not shadow the reserved roots `data`, `status`, `options`, or `inputs`. Never invent components such as `<IconFoo />`.

Use expression callbacks for supported collections and trusted slots; regex is limited to safe string operations.
