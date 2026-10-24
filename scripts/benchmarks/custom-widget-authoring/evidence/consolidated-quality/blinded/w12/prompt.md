You are a hostile-but-fair product review panel evaluating a safe dashboard widget. Most competent drafts should score 55-75, not 90. Judge only evidence present in the manifest and JSX. Never reward unsupported capabilities, invented API routes, aspirational claims, or code that merely validates.

The installed Homarr skill and runtime references below are authoritative. The verified API notes and representative response fixtures are authoritative for endpoint paths, authentication requirements, and response shapes unless the validated manifest contradicts them. Do not invent external endpoint or authentication objections from outside assumptions. Judge only the scoped Request below; an endpoint mentioned in broader API notes is available, not automatically required, and an optional fixture field omitted by the scoped Request is not a missing capability. Decorative icons paired with equivalent adjacent visible status text need no separate aria-label. A Badge containing explicit visible status text is not color-only. Date.toLocaleString(value, "en-US", "UTC") is an installed safe static helper for concise absolute UTC timestamps; do not require relative time. In particular, request state is exposed as status.<requestId> with loading/ok/status/error fields while successful payloads are exposed as data.<requestId>. RefreshButton is an installed runtime helper: it refreshes load queries by default; inside a successful manual result, requestId targets and reruns that active query with unchanged parameters. A bound Pagination should declare defaultValue={1}; resetKey={inputs.query} restores that default when its dependent scalar query changes. SubFetch without trigger="manual" runs automatically and reruns when bound params change, so never demand a hidden input, debounce callback, or raw event. When the scoped Request requires manual search, do not penalize the required re-trigger after query or page changes. A manual SubFetch synchronously hides its old result and returns to its trigger when its request ID, normalized parameters, or effective definition changes; it cannot display stale results under edited inputs or fetch the new parameters before another trigger. ActionButton supplies pending UI, native success/error notification, confirmation, and declared invalidation; do not demand duplicate local action state. Safe templates forbid local declarations and helper functions; do not penalize a repeated short literal label array used for distinct enum fields, or a repeated pure collection/count expression that must drive both an empty branch and rendered content, as an avoidable missing abstraction. Every component in this already-validated template exists in the installed release. Do not penalize those documented facts. The widget has already passed Homarr's real schema and JSX analyzer, which proves syntax and component compatibility but does not prove API correctness, visual quality, usefulness, or accessibility.

Task-relevant installed Homarr runtime references:
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


Request:
Using the supplied fake API contract, create a polished service-health widget for a small homelab. Prioritize the overall state, incident count, latency, last check time, and a compact list of services. It must be immediately useful in narrow and wide dashboard tiles.

Verified API notes:
This is a deterministic fake API. Use https://status.example.test with no authentication. GET /v1/health returns the exact sample response. Do not invent additional endpoints or actions.

Representative API response used by the preview test:
{
  "status": "degraded",
  "checkedAt": "2026-08-10T12:00:00Z",
  "latencyMs": 184,
  "openIncidents": 1,
  "services": [
    {
      "id": "media",
      "name": "Media",
      "status": "operational",
      "latencyMs": 42
    },
    {
      "id": "photos",
      "name": "Photos",
      "status": "degraded",
      "latencyMs": 331
    },
    {
      "id": "dns",
      "name": "DNS",
      "status": "operational",
      "latencyMs": 8
    }
  ]
}

Validated widget:
{
  "$schema": "homarr-custom-widget-v2",
  "name": "Service health",
  "description": "Live overall health, incident count, latency, last check time, and service statuses.",
  "sources": {
    "default": {
      "name": "Status API",
      "baseUrl": "https://status.example.test",
      "auth": "none"
    }
  },
  "requests": {
    "health": {
      "source": "default",
      "kind": "query",
      "method": "GET",
      "path": "/v1/health",
      "trigger": "load",
      "auth": "inherit",
      "permission": "view"
    }
  },
  "options": {},
  "template": "<Stack gap=\"xs\"><Group justify=\"space-between\" wrap=\"nowrap\"><Text fw={600} truncate>Service health</Text><RefreshButton requestId=\"health\" label=\"Refresh\" /></Group>{status.health?.loading ? <Skeleton height={150} /> : status.health?.ok === false ? <Alert color=\"red\" title=\"Health check unavailable\">{status.health.statusText || status.health.error || \"Request failed\"}</Alert> : !data.health?.status ? <Text size=\"sm\" c=\"dimmed\">No health data available</Text> : <Stack gap=\"xs\"><Group gap=\"xs\" align=\"baseline\"><Text fz={26} fw={700} c={({ operational: \"green\", degraded: \"orange\", down: \"red\" })[data.health.status] ?? \"gray\"}>{({ operational: \"Operational\", degraded: \"Degraded\", down: \"Down\" })[data.health.status] ?? \"Unknown\"}</Text><Text size=\"sm\" c=\"dimmed\">Overall</Text></Group><SimpleGrid minColWidth={140} autoFlow=\"auto-fit\" spacing=\"xs\"><Stack gap={0}><Text size=\"xs\" c=\"dimmed\">Open incidents</Text><Text fw={600}>{data.health.openIncidents?.toLocaleString(\"en-US\") ?? \"—\"}</Text></Stack><Stack gap={0}><Text size=\"xs\" c=\"dimmed\">Latency</Text><Text fw={600}>{data.health.latencyMs?.toLocaleString(\"en-US\") ?? \"—\"} ms</Text></Stack><Stack gap={0}><Text size=\"xs\" c=\"dimmed\">Last check · UTC</Text><Text size=\"sm\" fw={500}>{data.health.checkedAt ? Date.toLocaleString(data.health.checkedAt, \"en-US\", \"UTC\") : \"—\"}</Text></Stack></SimpleGrid><Stack gap=\"xs\"><Text size=\"sm\" fw={600}>Services</Text>{(data.health.services ?? []).length === 0 ? <Text size=\"sm\" c=\"dimmed\">No services reported</Text> : <Stack gap={4}>{(data.health.services ?? []).map(service => <Group key={service.id} justify=\"space-between\" wrap=\"nowrap\" gap=\"xs\"><Text size=\"sm\" truncate>{service.name ?? \"Unknown\"}</Text><Group gap=\"xs\" wrap=\"nowrap\"><Text size=\"xs\" c=\"dimmed\">{service.latencyMs?.toLocaleString(\"en-US\") ?? \"—\"} ms</Text><Badge color={({ operational: \"green\", degraded: \"orange\", down: \"red\" })[service.status] ?? \"gray\"}>{({ operational: \"Operational\", degraded: \"Degraded\", down: \"Down\" })[service.status] ?? \"Unknown\"}</Badge></Group></Group>)}</Stack>}</Stack></Stack>}</Stack>"
}

Scoring calibration:
- 95-100: exceptional, purpose-built quality; complete, beautiful, restrained, and something a demanding user would choose every day. Almost never award this.
- 85-94: excellent with only small, specific defects. It must fully achieve the request and feel deliberately designed.
- 70-84: good prototype or useful widget with visible compromises, generic design, missing polish, or avoidable complexity.
- 50-69: functional but incomplete, awkward, visually ordinary, overbuilt, or impractical for repeated use.
- 0-49: broken, misleading, unsafe, substantially incomplete, or incompatible.

Required review behavior:
- Compare every requested capability with concrete manifest/JSX evidence. A missing or invented core capability is fatal and caps total at 79.
- Judge whether the API design can actually reach the stated goal, including response paths, bindings, invalidation, and action safety.
- Judge visual quality, not component count: hierarchy, density, whitespace, typography, restrained color, scanability, and avoidance of repetitive nested cards.
- A purpose-specific asymmetric summary, divided hierarchy, responsive density, and restrained semantic accents can clear 75 without decorative chrome. Do not demand gradients, novelty, or a generic selected-row detail interaction.
- Judge daily usefulness: information priority, interaction cost, refresh behavior, narrow-tile usability, and whether the widget is pleasant rather than demo-like.
- Do not penalize a missing last-refreshed timestamp when the verified response has no freshness field; cache policy plus a labeled RefreshButton is complete. Do not penalize a deliberately bounded first-page view for lacking pagination unless the scoped Request asks for pagination or browsing the full collection.
- A required manual search rerun is deliberate interaction, not daily-use friction. SubFetch owns failure and retry before its child renders; never demand an unreachable child error branch or a RefreshButton there.
- Judge complexity discipline: penalize duplicate requests/options, unnecessary controls, excessive JSX, cleverness, and UI chrome that does not help the goal. Complexity must earn its place.
- Recommend only interactions supported by the installed authoring contract. Do not suggest portals, modals, arbitrary event handlers, or other blocked capabilities. Prefer a responsive in-widget detail area when separation is useful.
- A visually generic but valid widget should normally score below 75 for visualQuality. A widget that is attractive but inconvenient should score below 75 for dailyUsefulness.
- Give a concrete evidence sentence for every category. List all score-capping issues under fatalProblems.
- Return an empty fatalProblems array when there are no fatal problems; never put "none" or an explanation of their absence in that array.

Homarr computes the weighted total and final verdict itself. Your total and verdict are advisory, but must be internally honest. A pass requires a weighted total of at least 85, every category at least 75, goalFulfillment at least 85, complexityDiscipline at least 80, no fatal problem, and dailyUseDecision="would-use-daily". Return only the requested structured object.

Return ONLY one JSON object (no prose, no code fence) with exactly these keys:
{"total": 0-100, "verdict": "pass"|"fail", "dailyUseDecision": "would-use-daily"|"promising-but-not-daily"|"not-practical",
 "categories": {"schemaAndBindings":0-100,"apiAndRequestDesign":0-100,"runtimeCompatibility":0-100,"goalFulfillment":0-100,"visualQuality":0-100,"responsiveAndTheme":0-100,"loadingEmptyErrorSuccess":0-100,"dailyUsefulness":0-100,"complexityDiscipline":0-100,"accessibility":0-100,"actionSafety":0-100},
 "categoryReasons": {same keys: one evidence sentence each},
 "strengths": [..<=6], "problems": [..<=12], "fatalProblems": [..<=8], "highestImpactFixes": [..<=6]}

