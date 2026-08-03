# Issue Assessments

This file contains assessments of open issues in the homarr-labs/homarr repository.
Each entry references the issue, describes the fix needed, and gives a confidence/size estimate.

---

## #6507 — feat: disable integrations access without proper permissions

**Fix:** The integrations list page conditionally hides create/edit/delete buttons based on permissions, but the edit page at `manage/integrations/edit/[id]/page.tsx` has **no server-side permission check** — it renders for any authenticated user. The `integration.byId` tRPC procedure is only auth-guarded (`protectedProcedure`), not permission-guarded. Fix: add a server-side permission check on the edit page route (redirect if missing `integration-full-all`) and guard the `byId` procedure with `throwIfActionForbiddenAsync`.

**Size:** M | **Confidence:** High

---

## #6488 — `[homarr_base]` template variable rejected by API/validation schema

**Fix:** The `appHrefSchema` in `packages/validation/src/app.ts` requires `.url()` validation. The `[homarr_base]` template variable works in the UI (client-side resolution) but the server-side Zod schema rejects it on save. Fix: add an `.or()` clause to accept `[homarr_base]` prefixed strings, similar to how path-only hrefs were handled in PR #6148.

**Size:** XS | **Confidence:** High

---

## #6459 — bug: Error during refresh in Releases pane

**Fix:** The Releases widget uses `trpc.widget.releases.getLatest` with `staleTime: getReleasesQueryStaleTimeMs`. When the user right-clicks "Update" → "Refresh", the forced refetch triggers a transient race condition where `q.data` filters to undefined before the refetch completes, hitting the error path. Likely needs a loading/refetch state guard in the component.

**Size:** S | **Confidence:** Medium

---

## #6456 — feat: add custom refresh interval in widget settings

**Fix:** `refetchInterval` is currently hardcoded per widget kind (e.g., 5s for DNS-hole, null for releases). To add per-widget custom intervals, changes needed across: (1) widget options schema — add a `refreshInterval` option via the options builder, (2) tRPC client provider — read per-instance option instead of per-kind default, (3) board save/load — persist the custom interval.

**Size:** L | **Confidence:** High

---

## #6438 — bug: OOM with 1.71.0

**Fix:** Multiple pressure points: (1) app widget prefetch loads ALL apps for ALL widget instances into query cache simultaneously, (2) default `refetchInterval` of 30s triggers continuous queries, (3) websocket uses aggressive 5s keepalive and doesn't limit max connections — zombie connections accumulate. Fix: audit app prefetch loading pattern, add connection/cache limits.

**Size:** M | **Confidence:** Medium

---

## #6435 — feat: Expand Homarr API Coverage to Support Full Dashboard Automation

**Fix:** Massive feature — add CRUD API endpoints for admin user creation, search engines, dashboards, widgets, services, global settings, and backup/restore. The current API has 30+ routers but incomplete coverage. New endpoints, MCP tool definitions, OpenAPI specs, DB schemas, and validation schemas needed. Backup/restore is entirely new infrastructure.

**Size:** XL | **Confidence:** High

---

## #6416 — bug: Right Clicking Shortcut gives Pane Options Menu

**Fix:** The `WidgetContextMenu` component wraps every dashboard item with Mantine's `Menu.ContextMenu`, intercepting right-click events before they reach the app shortcut's `<a>` tag. The fix is to detect when the right-click target is an app widget and either pass through the native event or skip the context menu wrapper for link-type items.

**Size:** S | **Confidence:** High

---

## #6403 — feat: Dynamic apps fetched from reverse proxy

**Fix:** New integration concept — poll a reverse proxy API (Caddy, Traefik, etc.) for service/routing definitions and auto-create or sync Homarr apps. Requires: new integration logic to poll proxy APIs, ability to auto-create Homarr apps from discovered services, UI for selecting which discovered apps to add to the board, and periodic sync mechanism.

**Size:** L | **Confidence:** Medium

---

## #6392 — feat: Switch Board via keyboard shortcut

**Fix:** The project already uses `@mantine/hooks`' `useHotkeys` for existing shortcuts (toggleBoardEdit: mod+e, toggleColorScheme: mod+j, etc.). The board list is available from the router and header's `SelectBoardsMenu`. Fix: add new hotkey definitions (Ctrl+Shift+1-9, Ctrl+Shift+Left/Right), fetch accessible boards, wire navigation.

**Size:** S | **Confidence:** High

---

## #6300 — bug: Memory leak

**Fix:** Multiple sources: (1) all widgets poll every 30s via `queryCacheDefaultRefetchIntervalMs`, (2) query cache GC time is 24h (`queryCacheDefaultGcTimeMs`), (3) localStorage persistence grows unbounded with 1MB per-query limit but no reclamation, (4) query cache version buster can orphan old stored data. Fix: reduce GC time, stop refetch for invisible widgets, clean stale localStorage entries.

**Size:** M | **Confidence:** Medium

---

## #6271 — bug: TrueNAS Integration eating up memory on TrueNAS host

**Fix:** TrueNAS integration uses a persistent WebSocket connection and polls every 5s. Each poll triggers multiple WebSocket calls (system.info, reporting.get_data, pool.query, interface.query, reporting.netdata_get_data). The interface.query call is uncached and runs every poll even though network interfaces rarely change. Fix: cache network interfaces, increase refetch interval, reduce reporting data window.

**Size:** M | **Confidence:** Medium

---

## #6254 — feat: aMule integration

**Fix:** New integration following the established pattern — create `packages/integrations/src/amule/` with an integration class, testingAsync method, and optional download-client interface. Register in `packages/definitions/src/integration.ts`, add to `integrationCreators`, add docs page. ~8-12 files touched, each small and formulaic.

**Size:** L | **Confidence:** High

---

## #6207 — bug: Unifi integration not working

**Fix:** The UniFi integration creates an axios instance with both httpAgent and httpsAgent, but the `@homarr/node-unifi` library's Controller constructor receives only host and port — the protocol from the URL is not forwarded. If node-unifi defaults to HTTPS regardless of URL scheme, HTTP-only UniFi Dream Routers fail with SSL errors. Fix: pass protocol to Controller constructor or use HTTP-only agents when appropriate.

**Size:** S | **Confidence:** Medium

---

## #6177 — bug: Homarr red action buttons on Floorp browser spin forever

**Fix:** Action buttons spin forever in Floorp (Firefox fork). CSP violations were logged. Floorp's enhanced privacy features may block `unsafe-inline` scripts or handle CSP differently than standard browsers. Hard to diagnose without reproduction. Could be a small CSP tweak or a more involved browser compatibility fix.

**Size:** XS | **Confidence:** Low

---

## #6155 — feat: Transfer Beszel data to existing Dashdot graphs

**Fix:** Beszel currently has 4 dedicated widgets. To merge into the existing Dashdot-based widgets (healthMonitoring, systemResources, systemDisks): implement `ISystemHealthMonitoringIntegration` on `BeszelIntegration`, map Beszel's PocketBase data model to `SystemHealthMonitoring` interface, add `beszel` to health monitoring integration categories, update widget `supportedIntegrations`. Significant cross-package work.

**Size:** L | **Confidence:** Medium

---

## #6153 — feat: re-open: add Open WebUI integration

**Fix:** Standard integration pattern — create integration class in `packages/integrations/src/open-webui/`, register in `integrationDefs`, add exports, doc slug, Docker alias, and docs page. Patterns well-established (~8-12 files, each small and formulaic).

**Size:** M | **Confidence:** High

---

## #6152 — feat: re-open: add Wazuh integration

**Fix:** Standard integration pattern same as #6153 — new integration class, definition entry, exports, doc slug, Docker alias, docs page. Wazuh's REST API is well-documented; comparable scope to UptimeKuma or Gluetun integrations.

**Size:** M | **Confidence:** High

---

## #6128 — bug: Minified React error #301 (Download Client widget)

**Fix:** React error #301 ("Rendered more hooks than during previous render") in the downloads widget component (1300+ lines). Likely caused by an unstable key or prop change causing hook count mismatch — possible the `useEffect` syncing `sortStatus` from `options.defaultSort`. Needs reproduction to identify exact root cause; fix is small once found.

**Size:** XS | **Confidence:** Medium

---

## #6082 — bug: Unraid integration CPU calculation incorrectly reporting CPU load

**Fix:** Exact bug found: `systemInfo.metrics.cpu.cpus` has one entry per **thread** (logical processor), but calculation divides by `info.cpu.cores` (physical cores). On a 4-core/8-thread system at ~43% per thread, sum=344% ÷ 4 cores = 86% (actual ~43%). Fix: divide by `cpus.length` or `info.cpu.threads` instead of `info.cpu.cores`.

**Size:** XS | **Confidence:** High

---

## #6080 — bug: Dashboard layout oscillates when vertical scrollbar appears/disappears

**Fix:** `use-gridstack.ts` measures `wrapper.clientWidth` and recalculates `cellHeight` in resize listeners. When a scrollbar appears, `clientWidth` shrinks → cellHeight recalculates → layout reflows → scrollbar may disappear → width increases → triggers resize again. Fix: add debounce or width-change threshold in the `onResize` callback.

**Size:** S | **Confidence:** High

---

## #6050 — bug: background image is absent or cut off with white space

**Fix:** Background image is applied via CSS `background-image: url(${board.backgroundImageUrl})` without proxying. External URLs may be blocked by CORS ("Image corrupt or truncated" in Firefox). The path check for video detection may also filter boards with slashes in names. Fix: serve background images through the image proxy or add CORS-compatible headers.

**Size:** S | **Confidence:** Medium

---

## #6024 — bug: SyntaxError: Expecting Unicode escape sequence \uXXXX

**Fix:** Beszel integration makes many `response.json()` and `JSON.parse` calls without try-catch error handling for malformed JSON responses. The error indicates Beszel's PocketBase API returned a payload with broken Unicode escape sequences, likely in realtime SSE data. Fix: add defensive error handling to all JSON parsing in `beszel-integration.ts`.

**Size:** S | **Confidence:** High

---

## #6008 — bug: manage/about page fails to load with ECONNREFUSED

**Fix:** The `/manage/about` page is a server component that calls `getDependenciesAsync()` (scans package.json files) and imports static JSON. It makes no network requests itself, so ECONNREFUSED likely originates from a DB/Redis connection failure during SSR of the manage layout or middleware. Fix: add error boundaries or graceful fallback when upstream services are unavailable.

**Size:** S | **Confidence:** Medium

---

## #6002 — bug: Uptime-Kuma, paused has no effect

**Fix:** When a monitor is paused in Uptime-Kuma, heartbeats stop. The `mapMonitor` method falls back to `'paused'` only when `latestHeartbeat` is falsy — but if a paused monitor had a previous 'up' heartbeat, that heartbeat persists, so it shows as 'up'. The status page response schema only parses `id` and `name`, ignoring the `status` field. Fix: add `status` field to the monitor schema and check it for paused monitors.

**Size:** S | **Confidence:** High

---

## #5867 — feat: REST Endpoint to manage boards

**Fix:** Several board CRUD endpoints already exist via OpenAPI (list, create, rename, visibility, delete, settings, items). Missing: GET /api/boards/{id} (single board retrieval) and OpenAPI exposure of saveBoard (which persists sections/items/layouts). Following existing patterns, these need new procedures with OpenAPI meta annotations and zod schemas.

**Size:** M | **Confidence:** Medium

---

## #5769 — feat: Kubernetes integration as dashboard widgets instead of global tool

**Fix:** Transform the Kubernetes management tool from a monolithic admin page into reusable dashboard widgets. Currently a global tool page at /manage/tools/kubernetes with dedicated tRPC routers and singleton KubernetesClient. Needs new widget definitions (like dockerContainers), multi-cluster per-integration config, new integration kinds, and existing UI adapted as widget components.

**Size:** XL | **Confidence:** High

---

## #5730 — bug: Administration menu breaks if you click around too much

**Fix:** The admin sidebar navigation renders Mantine NavLink components. Rapid clicking across nested items causes a Mantine internal error — `onShowLinkUnderline` on an undefined reference. Likely a stale-state or race condition during rapid mount/unmount of sub-items when pathname changes while children are still mounting. Fix: stabilize NavLink rendering or add defensive null-checks.

**Size:** S | **Confidence:** Medium

---

## #5716 — bug: OIDC group assignment not working if only one group

**Fix:** Exact bug found: in `packages/auth/events.ts`, the sign-in handler checks `Array.isArray(profile[groupsKey])` before calling `synchronizeGroupsWithExternalForUserAsync`. When OIDC sends a single group as a string (`"groups": "admin"` instead of `["admin"]`), the array check fails and group sync is entirely skipped. Fix: normalize the groups value to always be an array before the check.

**Size:** XS | **Confidence:** High

---

## #5538 — bug: No integration data available for unraid disks

**Fix:** The Unraid integration maps disk data from GraphQL query fields into health monitoring fileSystem/smart arrays. The system-disks widget throws NoIntegrationDataError when healthInfo is empty. Could be GraphQL query field mismatch (the query references fields like `fsFree`/`fsUsed`/`size` that may differ from actual Unraid API schema) or parsing/validation issue against the zod schema in unraid-types.ts. Needs debugging to determine root cause.

**Size:** M | **Confidence:** Medium

---

## #5387 — feat: Pushover Integration

**Fix:** Add Pushover notification integration following the existing Gotify/Ntfy patterns. Implements `INotificationsIntegration` interface. Requires: new integration class + zod schema in `packages/integrations/src/pushover/`, registering in `integrationDefs` (with secretKinds for user key and API token), adding to integration creator map, and docs. Note: Pushover is an outgoing notification service (sends notifs), different from Gotify/Ntfy (poll notifs), so implementation differs.

**Size:** M | **Confidence:** High
