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

Manual queries require `trigger: "manual"` on request and `SubFetch`; otherwise they run automatically. `triggerContent` with `triggerAriaLabel` makes custom content the launcher; it is already wrapped in a button, so use non-interactive content such as Text or Card, never Button, Anchor, or form controls inside it. `SubFetch` owns loading/error/retry; its child receives success plus `{ ok, status, statusText, loading: false }`. Never author `onClick` or fetch callbacks.

`SubFetch`, `ActionButton`, and `ToggleSwitch` need literal `requestId`; validation rejects missing/computed IDs.

After an explicit `ActionButton` or `ToggleSwitch` invocation, its response is published as `data.requestId` and `status.requestId` in that widget instance. Guard the initial state before any action has run. This local response is not persisted across reloads; actions never execute automatically.

SubFetch/ActionButton params must contain exactly the names referenced by $param or {param:name} in that request. Fixed query values such as limit or fields belong in requests.<id>.query, not params. Test using the same parameter names the JSX will supply; do not fix only the test call while leaving mismatched JSX.
When a manual SubFetch ID, params, or definition changes, Homarr hides the prior result and returns to the trigger; new params fetch only after triggering again.

Exact paths: load request ID `q` with raw preview body `B` -> `data.q === B`. `q=events` body`{"events":[...]}` -> `data.events.events`; do not flatten repeated keys. Manual `SubFetch` receives `B` as result -> `result.events`. Before persistence inspect core paths against preview; revise JSX and retest if mismatched

Format timestamps with safe static helpers; never use `new Date`. Never invent a formatter component. Use `Date.toLocaleString(value, "en-US", documentedTimezone)` and label the documented timezone; if no timezone is documented, preserve the source value or omit any timezone label; use UTC only when the response contract says UTC. For countdowns, `Date.getTime(isoTimestamp) - Date.now()` gives milliseconds; `Date.parse` is unavailable. Also available: `Date.toISOString`, plus `Date.toLocaleDateString` and `Date.toLocaleTimeString` with the same arguments. Numbers: `n.toLocaleString("en-US", { maximumFractionDigits: 1, notation: "compact" })`; `style` percent/currency/unit (with `currency`/`unit`) and `signDisplay` also work.

For compact numeric enums, index a literal label array with a fallback:

```jsx
<Text>{["Unknown", "Pending", "Ready"][(item.status ?? 1) - 1] ?? "Unknown"}</Text>
```

Request-bound controls use literal `bind` plus a default (`defaultChecked` for Switch/Checkbox); pass `inputs.<name>` through manual `SubFetch params` to matching `$param`. Dependent pagination uses `defaultValue={1}`/`resetKey={inputs.query}`. Remove dead controls.

Callback parameters must not shadow the reserved roots `data`, `status`, `options`, or `inputs`. Never invent components such as `<IconFoo />`.

Use expression callbacks for supported collections and trusted slots; regex is limited to safe string operations.
