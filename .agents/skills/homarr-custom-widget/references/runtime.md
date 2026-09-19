# Runtime

Load-query templates read `data.requestId` and `status.requestId`, plus `options.name` and temporary `inputs.name`. Manual `SubFetch` results stay local to that instance and never populate `data`/`status`; render them in its child callback. Status is `{ loading, ok, status, statusText, error }`. Render load queries directly from `data` and `status` with `RefreshButton`; never wrap them in `SubFetch`.

`bind` is temporary; manual request values go in `params` and map to `$param`:

```jsx
<TextInput bind="search" label="Search" />
<NumberInput bind="page" label="Page" defaultValue={1} resetKey={inputs.search} min={1} />
<SubFetch requestId="search" trigger="manual" params={{ query: inputs.search ?? "", page: inputs.page ?? 1 }}>
  {(result) => <Stack>{(result.results ?? []).map(item => <Text key={item.id}>{item.name}</Text>)}</Stack>}
</SubFetch>
```

Manual queries require `trigger: "manual"` on request and `SubFetch`; otherwise they run automatically. `triggerContent` with `triggerAriaLabel` makes custom content the launcher. `SubFetch` owns loading/error/retry; its child receives success plus `{ ok, status, statusText, loading: false }`. Never author `onClick` or fetch callbacks.

`SubFetch`, `ActionButton`, and `ToggleSwitch` need literal `requestId`; validation rejects missing/computed IDs.

Inside a successful manual result, `<RefreshButton requestId="search" label="Run again" />` reruns the same parameters.

When a manual SubFetch ID, params, or definition changes, Homarr hides the prior result and returns to the trigger; new params fetch only after triggering again.

Exact paths: load request ID `q` with raw preview body `B` -> `data.q === B`. `q=events` body`{"events":[...]}` -> `data.events.events`; do not flatten repeated keys. Manual `SubFetch` receives `B` as result -> `result.events`. Before persistence inspect core paths against preview; revise JSX and retest if mismatched

Format timestamps with safe static helpers; never use `new Date`. Never invent a formatter component. Use `Date.toLocaleString(value, "en-US", documentedTimezone)` and label the documented timezone; if no timezone is documented, preserve the source value or omit any timezone label; use UTC only when the response contract says UTC. Also available: `Date.toISOString`, `Date.toLocaleDateString`, and `Date.toLocaleTimeString`.

For compact numeric enums, index a literal label array with a fallback:

```jsx
<Text>{["Unknown", "Pending", "Ready"][(item.status ?? 1) - 1] ?? "Unknown"}</Text>
```

Request-bound controls use literal `bind` plus a default (`defaultChecked` for Switch/Checkbox); pass `inputs.<name>` through manual `SubFetch params` to matching `$param`. Options are installation config via `options.name`, never `inputs`; dependent pagination uses `defaultValue={1}`/`resetKey={inputs.query}`. Remove dead controls.

Callback parameters must not shadow the reserved roots `data`, `status`, `options`, or `inputs`. Use registered component names returned by discovery; `Icon` is an accepted alias for canonical `TablerIcon`. Never invent components such as `<IconFoo />`.

Use expression callbacks for supported collections and trusted slots. No callback blocks, IIFEs, authored recursion, or raw events. Regex is limited to safe string operations.
