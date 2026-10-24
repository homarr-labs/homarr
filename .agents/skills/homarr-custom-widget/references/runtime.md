# Runtime

Loads read `data.requestId`/`status.requestId` with RefreshButton, not SubFetch. Installation config is `options.name`;
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

Exact paths: load request ID `q` with raw preview body `B` -> `data.q === B`. `q=events` body`{"events":[...]}` -> `data.events.events`; do not flatten repeated keys. Manual `SubFetch` receives `B` as result -> `result.events`. Before persistence inspect core paths against preview; revise JSX and retest if mismatched

Safe timestamps: `Date.toLocaleString(value, "en-US", documentedTimezone)`; omit the timezone argument/label if unknown.
UTC needs a documented UTC contract. Also: Date.toISOString/toLocaleDateString/toLocaleTimeString. Countdowns:
`Date.getTime(isoTimestamp) - Date.now()` in milliseconds; no new Date, Date.parse, or invented formatters.
Numbers: `n.toLocaleString("en-US", { maximumFractionDigits: 1, notation: "compact" })`;
style percent/currency/unit (with currency/unit) and signDisplay also work. Preserve units or convert numbers before relabeling.

Keep useful data reachable: summaries plus Table/details, working filters, pagination, or a bounded ScrollArea for collections.
Cover requested fields and meaningful observed facts; never silently slice rows. Label partial results and shown/total counts.
Use only verified pagination params/endpoints. Charts need real numeric/category/time series, never invented history/series.
A bounded response-shape summary is not a full schema: inspect omitted
fields when needed, preserve envelopes, and guard heterogeneous items. Keep loading/error/empty/success and narrow/wide states useful.

Verified Mantine 9.6.0 common chart contract: LineChart/AreaChart/BarChart require positive h, data: row[], dataKey: actual category/time row key, series: [{name: actual numeric row key, color: MantineColor}]. Sparkline requires positive h and data: number[]. Bind real response fields/series, never fabricated history or arbitrary formatter callbacks. Resolve only other chart props lazily.

Controls need literal bind, a default (defaultChecked for Switch/Checkbox), and matching manual params from inputs.name.
Dependent pagination uses `defaultValue={1}`/`resetKey={inputs.query}`. Remove dead controls.

Callback parameters must not shadow the reserved roots `data`, `status`, `options`, or `inputs`. Never invent components such as `<IconFoo />`.

Use expression callbacks for supported collections and trusted slots; regex is limited to safe string operations.
