# Runtime

Load queries read `data.requestId` (the untouched decoded response body) and `status.requestId` (`loading`, `ok`, `status`,
`statusText`, `error`). For request `events` returning `{"events":[...]}`, use `data.events.events`. Guard optional arrays and
nested fields; `status.events?.ok === false` is an error. Keep sibling request states independent. Use one RefreshButton per
load request outside its state branches.

Manual queries set `trigger: "manual"` on both request and SubFetch. Results stay local to that SubFetch; its child receives
`(result, metadata)` with the same response envelope. SubFetch owns loading/error/retry, and metadata has
`{ ok, status, statusText, loading: false }`.

```jsx
<Stack>
  <TextInput bind="search" label="Search" defaultValue="" />
  <NumberInput bind="page" label="Page" defaultValue={1} resetKey={inputs.search} min={1} />
  <SubFetch requestId="search" trigger="manual" params={{ query: inputs.search ?? "", page: inputs.page ?? 1 }}>
    {(result) => (
      <Stack>
        {(result.results ?? []).map((item) => (
          <Text key={item.id}>{item.name}</Text>
        ))}
      </Stack>
    )}
  </SubFetch>
</Stack>
```

SubFetch/ActionButton params match exactly the `$param`/`{param:name}` references in that request. Fixed values belong in
request query/body. When a manual request ID, params, or definition changes, the prior result hides until triggered again.
Inside a successful manual result, RefreshButton with the same requestId reruns its captured parameters.

SubFetch, ActionButton, and ToggleSwitch need literal requestId. `triggerContent` plus `triggerAriaLabel` supplies a SubFetch
launcher already wrapped in a button; use non-interactive Text/Card content. Actions never run automatically. After an
explicit ActionButton/ToggleSwitch invocation, its response appears in that widget's `data.requestId`/`status.requestId` until
reload. Guard the initial state. Preserve request confirmation, permission, and invalidations.

Installation options use `options.name`. Temporary controls use literal `bind` and `defaultValue` (`defaultChecked` for
Switch/Checkbox); send `inputs.name` through manual params. Dependent pagination uses `defaultValue={1}` and
`resetKey={inputs.search}`. Controls must affect a request or visible selection.

Safe Date helpers: `Date.toISOString`, `Date.toLocaleString`, `Date.toLocaleDateString`, `Date.toLocaleTimeString`,
`Date.getTime`, and `Date.now`. Guard missing timestamps. Use `Date.toLocaleString(value, "en-US", documentedTimezone)` when a
timezone is specified; otherwise omit the timezone argument/label or preserve the source value. Label UTC only when the
contract says UTC. Countdowns use `Date.getTime(isoTimestamp) - Date.now()` in milliseconds. Constructors and Date.parse are
unavailable.

Use registered component names; Icon aliases TablerIcon and accepts installed kebab-case names. Concise expression callbacks
support collections and trusted slots; their parameters cannot shadow `data`, `status`, `options`, or `inputs`. Regex is
limited to safe string operations. Numeric enums can use a literal label array with a fallback.
