# Runtime

Templates read `data.requestId`, `status.requestId`, `options.name`, and temporary `inputs.name`. Status is `{ loading, ok, status, statusText, error }`. Render load queries directly from `data` and `status` with `RefreshButton`; never wrap them in `SubFetch`.

`bind="search"` creates an in-memory input. It is never persisted. Supply invocation values only through `params`, for example:

```jsx
<TextInput bind="search" label="Search" />
<Pagination bind="page" resetKey={inputs.search} defaultValue={1} total={5} />
<SubFetch requestId="search" trigger="manual" params={{ query: inputs.search }}>
  {(items) => <Stack>{(items ?? []).map(item => <Text key={item.id}>{item.name}</Text>)}</Stack>}
</SubFetch>
```

Manual queries require `trigger: "manual"` on request and `SubFetch`; otherwise they run automatically. `triggerContent` with `triggerAriaLabel` makes custom content the launcher. `SubFetch` owns loading/error/retry; its child receives success plus `{ ok, status, statusText, loading: false }`. Never author `onClick` or fetch callbacks.

`SubFetch`, `ActionButton`, and `ToggleSwitch` need literal `requestId`; validation rejects missing/computed IDs.

Inside a successful manual result, `<RefreshButton requestId="search" label="Run again" />` reruns the same parameters.

When a manual SubFetch request ID, parameters, or effective definition changes, Homarr immediately hides its prior result and returns to the trigger. It cannot fetch the new parameters until the user triggers it again.

The `SubFetch` callback receives the entire JSON response exactly as previewed. If the response is `{ "results": [...] }`, render and map `result.results`; never map the envelope itself. Trace every rendered field from the preview response before persistence.

Format timestamps with safe static helpers; never use `new Date`. Never invent a formatter component. Use `Date.toLocaleString(value, "en-US", "UTC")` plus a visible `UTC` label. Also available: `Date.toISOString`, `Date.toLocaleDateString`, and `Date.toLocaleTimeString`.

For compact numeric enums, index a literal label array with a fallback:

```jsx
<Text>{["Unknown", "Pending", "Ready"][(item.status ?? 1) - 1] ?? "Unknown"}</Text>
```

Every stateful control must use `bind`, and its `inputs.<name>` value must feed a supported request/helper when it is meant to change remote data. For dependent pagination, declare `defaultValue={1}` and use `resetKey={inputs.search}` to restore page 1 when the query changes. If a control cannot affect the workflow through a binding, option, or runtime helper, render concise context instead of a dead control.

Callback parameters must not shadow the reserved roots `data`, `status`, `options`, or `inputs`. Use `<Icon name="refresh" />` or `<TablerIcon name="refresh" />`; never invent components such as `<IconFoo />`.

Use expression callbacks for supported collections and trusted slots. No callback blocks, IIFEs, authored recursion, or raw events. Regex is limited to safe string operations.
