# Runtime

Load queries render `data.requestId`/`status.requestId` with `RefreshButton`, not `SubFetch`. Status: `{ loading, ok, status, statusText, error }`. Manual `SubFetch` results are instance-local, never `data`/`status`; render them in its child.

`bind` is temporary; manual request values go in `params` and map to `$param`:

```jsx
<TextInput bind="search" label="Search" />
<NumberInput bind="page" label="Page" defaultValue={1} resetKey={inputs.search} min={1} />
<SubFetch requestId="search" trigger="manual" params={{ query: inputs.search ?? "", page: inputs.page ?? 1 }}>
  {(result) => <Stack>{(result.results ?? []).map(item => <Text key={item.id}>{item.name}</Text>)}</Stack>}
</SubFetch>
```

Manual queries need `trigger: "manual"` on request and `SubFetch`; otherwise they run automatically. `triggerContent`/`triggerAriaLabel` customize its button wrapper: use non-interactive Text/Card, never Button, Anchor or form controls. `SubFetch` owns loading/error/retry; its child receives (result, `{ ok, status, statusText, loading: false }`) on success. No authored `onClick`/fetch callbacks.

`SubFetch`, `ActionButton`, `ToggleSwitch` require literal `requestId`; missing/computed IDs fail validation.

Explicit `ActionButton`/`ToggleSwitch` invocations publish responses to that widget's `data.requestId`/`status.requestId`. Guard the pre-action state. Responses do not survive reloads; actions never run automatically.

Inside a successful manual result, `<RefreshButton requestId="search" label="Run again" />` reruns the same parameters.

SubFetch/ActionButton params must exactly match that request's $param/{param:name} names. Fixed query values (limit/fields) belong in requests.<id>.query, not params. Test the JSX's parameter names; repair mismatches in both. Changing a manual SubFetch ID, params or definition hides old results and restores the trigger; fetch again only on invocation.

Exact paths: load ID `q`, raw body `B` -> `data.q === B`; ID `events`, body `{"events":[...]}` -> `data.events.events`. Manual `SubFetch` receives `B` -> `result.events`. Preserve repeated keys; check core paths against previews, revise/retest before saving.

Use static `Date.toLocaleString(value, "en-US", documentedTimezone)`, labeling only documented timezones; otherwise preserve the source value or omit the timezone label. UTC requires a UTC response contract. Countdowns: `Date.getTime(isoTimestamp) - Date.now()` is milliseconds. Also supported: `Date.toISOString`, `Date.toLocaleDateString`, `Date.toLocaleTimeString`. No `new Date`, `Date.parse` or invented formatter components.

Numeric enum labels need a fallback:

```jsx
<Text>{["Unknown", "Pending", "Ready"][(item.status ?? 1) - 1] ?? "Unknown"}</Text>
```

Request controls use literal `bind` + default (`defaultChecked` for Switch/Checkbox); map temporary `inputs.<name>` through manual `SubFetch params` to matching `$param`. Installation config is `options.name`, not `inputs`. Dependent pagination: `defaultValue={1}`/`resetKey={inputs.query}`. Remove dead controls.

Callback parameters cannot shadow `data`, `status`, `options`, `inputs`. Discover registered names; `Icon` aliases `TablerIcon`, not invented `<IconFoo />` components.

Use expression callbacks for supported collections/trusted slots; no blocks, IIFEs, recursion or raw events. Regex: safe string operations only.
