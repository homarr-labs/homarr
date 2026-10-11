# Audit 12: API integration data

## Scope and confidence

All 75 assigned files received a full-file read; the two designated large routers also received dedicated sequential passes. Concrete consumer and dependency checks were added for the two findings below. Coverage is recorded in `audit-evidence/2026-10-11/coverage/audit_12.json`.

No production files were changed. No tests, builds, runtime measurements, or database benchmarks were run. The code paths and asymptotic dimensions below are established from source; catalog/integration sizes, wall time, heap delta, and driver bytes were not measured. Do not interpret the findings as a demonstrated user-visible latency or memory incident.

## Finding: media-search integration lookup materializes complete linked widget rows

**Call path and trigger:** Spotlight's media mode first calls `integration.mediaRequestSearchTargets` and then calls `integration.searchMediaRequests` for an enabled remote media query. The targets query has a 60-second stale time; the search query is keyed by the current remote query. Both procedures call `getAccessibleMediaRequestSearchIntegrationsAsync` in `packages/api/src/router/integration/integration-router.ts` (lines 617–659 and helper lines 800–832).

**Cause and proof of need:** That helper loads `items: { with: { item: true } }` for every matching media integration. The relation is integration → integration item → item row. `hasQueryAccessToIntegrationsAsync` needs the linked rows for board-inherited integration access, but reads only `integration.items[].item.boardId` (see `packages/auth/permissions/integration-query-permissions.ts`, lines 10–23 and 30–58). The media target response projects identity, name, kind, URL and interaction permission. The search path uses integration identity/kind/URL, linked app href, secrets, and permission relations; it does not use widget item kind or serialized options. The item table also stores `options` and `advancedOptions` text (`packages/db/schema/sqlite.ts`, lines 418–426), which are included in each full related row.

**Dimensions:** For I linked widget placements across matching integrations, each request materializes O(I) association and full item records in application memory and performs corresponding DB row work. The avoidable portion includes each row's options strings; exact allocated bytes and query duration are unknown. This is DB-to-process row materialization, not client response data: the targets response is projected, and the search response contains upstream search results. No network-transfer-byte claim is made. Repeated invocation during Spotlight searches repeats the lookup, subject to query caching; no retained server-side item cache was found in this helper.

**Smallest compatible fix:** Keep the association relation and authorization flow, but project the nested item to `columns: { boardId: true }`. Keep the integration permission relations and all app/secrets data currently consumed by the search logic. This preserves the list of linked boards, including empty/non-empty membership checks, and avoids loading item options and other item fields. Confirm the selected Drizzle relation shape remains accepted by `hasQueryAccessToIntegrationsAsync` and both endpoints.

**Tradeoffs and evidence still needed:** Narrow projection adds a schema-aware query selection that must stay aligned with the auth helper's board-ID requirement. Measure with fixtures or representative production-like data containing increasing linked widget counts and large option strings: DB query duration, rows/column bytes returned by the driver, request wall time, and server heap before/after. Compare targets and search results for direct integration permission, board-inherited permission, inaccessible integration, and no linked items. The current code establishes the avoidable payload; it does not establish a material user impact. Confidence is high in the unnecessary fields and medium in impact.

## Finding: icon-picker searches rank the entire icon catalog on every query

**Call path and trigger:** `IconPicker` debounces draft input by 250 ms, calls `clientApi.icon.findIcons` with `limitPerGroup: 24`, and keeps previous results as placeholder data (`packages/forms-collection/src/icon-picker/icon-picker.tsx`, lines 78–88). `findIcons` is also exposed as an MCP tool. For each non-empty term, the router reads every icon's id, name, and URL for every repository, ranks them in JavaScript, sorts matching rows, and only then slices each repository to the requested limit (`packages/api/src/router/icons.ts`, lines 17–50). Empty-term browsing is already limited in SQL.

**Dimensions:** For N catalog icons and M matches, a non-empty search reads/materializes O(N) icon rows and runs matching over O(N) candidates, followed by O(M log M) sorting and O(M) temporary match/result arrays. The return is capped at 24 rows per repository for the picker, so this finding does not claim that all icon data is sent to the browser. Actual catalog size, per-search latency, memory delta, and database driver bytes were not measured; those determine practical impact. Intermediate ranking arrays are temporary, not evidence of retained memory or a leak.

**Smallest compatible fix:** Do not apply a simple result limit before ranking, because that can change the best matches. If representative measurements justify a fix, move candidate selection to a normalized searchable DB value or equivalent indexed representation while preserving `normalizeImageName`/`getImageMatchRank` semantics, SVG tie-breaking, and per-repository limits. This likely requires extending icon ingestion/schema and should be scoped only after measuring the current catalog and query path.

**Tradeoffs and evidence still needed:** A precomputed searchable representation adds stored data and index/ingestion work; an approximate SQL predicate risks dropping valid accent-, punctuation-, extension-, token-, or prefix-based matches. First record icon row count by repository and benchmark common and adversarial searches against the existing ranking, including full result equality, query duration, temporary heap, and DB-to-process bytes. Confidence is high in the O(N) path and medium-low in user impact or fix priority without those measurements.

## Dedicated large-file passes

### `packages/api/src/router/integration/integration-router.ts`

Read the full assigned file in consecutive ranges, then traced `mediaRequestSearchTargets` and `searchMediaRequests` to the Spotlight consumer and permission helper. The integration query result contains permission relations used by auth and secrets/app data used for the upstream call. The full `items.item` records are the avoidable portion; linked item board IDs remain required for board-based access checks. Other integration lookups return bounded/projected public data or use small configuration collections; no additional actionable retention finding was supported.

### `packages/api/src/router/onboard/onboard-router.ts`

Read the full assigned file in consecutive ranges and checked its setup-studio caller. `discoverDockerServices` returns container-derived app/integration suggestions, while `completeSetup` is a one-time mutation that loads board layouts/items to preserve existing placement, plan selected resources/widgets, and commit in one transaction. It currently reads the full board list with relations, although only the chosen board's contents drive placement. Other board rows support target and duplicate-name validation. No board-count/size or completion-time evidence was available, so I did not elevate this to a finding. Docker discovery also materializes container records and icon candidates, but the setup UI consumes discovered suggestions and no representative host/container sizing was available to support an actionable bound claim.

## Other reviewed behavior

The log subscription subscribes before loading history, temporarily buffers matching events during that load, filters history duplicates, clears the buffer after replay, and unsubscribes on closure. The buffer is burst-sized while history is pending, but no event-rate/history-delay evidence supports a defect. Beszel live metrics use a bounded queue that discards stale snapshots and clears queued values at closure/failure. The widget router uses explicit lazy imports. Other assigned widget procedures generally forward bounded integration results or request-handler cache results; no measured result-size distribution justified a broader payload or CPU finding.
