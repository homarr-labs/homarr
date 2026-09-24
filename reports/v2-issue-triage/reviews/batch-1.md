# Batch 1 — 27 issue assessments

Reconciled assessment data. See [parent review notes](../PARENT-REVIEW.md) for subsequent corrections.

### #6807 — bug: MCP tools/list fails on invite_createInvite z.date() schema

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6807) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 exposes the invite expiration as an ISO string schema and converts it to Date only at persistence, making tools/list JSON-compatible.

**Conversation (0 comments read):** No comments were present. The issue reports MCP tools/list failing while converting invite_createInvite's z.date schema. The merged v2 invitation-schema fix changes the public input to an ISO datetime string and current MCP tests cover timestamp conversion/validation.

**V2 evidence:**

- packages/api/src/router/invite.ts:55-61,70-84 — createInvite accepts z.iso.datetime({ offset: true }), documents an ISO string to MCP, then constructs a Date for the database. — [source L55](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/invite.ts#L55)
- packages/api/src/mcp-tools.ts:99-139 — MCP extraction converts Zod inputs to JSON Schema, forces an object root, validates the schema, and records safe diagnostics. — [source L99](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/mcp-tools.ts#L99)
- apps/nextjs/src/app/api/mcp/_protocol.ts:43-49 — the protocol registers the JSON-Schema-derived input with the MCP server instead of passing the Zod date schema. — [source L43](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_protocol.ts#L43)
- apps/nextjs/src/app/api/mcp/_protocol.spec.ts:297-320 — tests accept ISO timestamps (including no seconds/offset forms) and reject invalid dates. — [source L297](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_protocol.spec.ts#L297)

**Remaining / follow-up:** No remaining gap for the reported tools/list failure. Verify a live MCP tools/list and invite call after deployment if protocol/client versions differ.

### #6803 — feat: Add support for Unraid Storage Pools

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6803) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2's Unraid GraphQL query and schema still cover array disks only; they do not request or map array caches/storage pools.

**Conversation (0 comments read):** No comments were present. The request specifies the Unraid GraphQL caches fields (id, name, device, size, status, temp, fsSize, fsFree, fsUsed, type, isSpinning) and asks for array plus pool/pool-only support while tolerating null filesystem fields. Cross-reference #5538 is a related missing-data bug, not evidence of a v2 implementation.

**V2 evidence:**

- packages/integrations/src/unraid/unraid-integration.ts:84-121 — the GraphQL query requests array.state, capacity.disks, and array.disks fields, with no array.caches selection. — [source L84](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L84)
- packages/integrations/src/unraid/unraid-types.ts:21-40 — the parsed array schema contains capacity.disks and disks only; there is no caches/pools object. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-types.ts#L21)
- packages/integrations/src/unraid/unraid-integration.ts:36-67 — mapped system information is built from the existing array.disks path and cannot expose pool records. — [source L36](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L36)
- packages/widgets/src/health-monitoring/system-health.tsx:210-225 — the health UI formats the existing disk data but has no storage-pool data source. — [source L210](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/system-health.tsx#L210)

**Remaining / follow-up:** Add version-tolerant GraphQL caches/pools query fields and nullable schema/mapping, then render and test array, cache-only, and null filesystem cases. Do not close this from the #5538 reference.

### #6712 — bug: What's Up Docker (WUD) Integration Won't Connect with Username and Password

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6712) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 sends HTTP Basic authentication for both WUD connection tests and container data requests.

**Conversation (0 comments read):** No comments were present. The report says WUD protected by username/password fails despite the service working without auth. Merged v2 PR #6831 adds the auth header to both relevant paths and validates the WUD containers response.

**V2 evidence:**

- packages/integrations/src/wud/wud-integration.ts:15-35 — connection testing requests /api/containers with getAuthHeaders and parses the response. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/wud/wud-integration.ts#L15)
- packages/integrations/src/wud/wud-integration.ts:38-50 — dashboard data uses the same authenticated /api/containers request with timeout handling. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/wud/wud-integration.ts#L38)
- packages/integrations/src/wud/wud-integration.ts:53-63 — username/password secrets are encoded into an Authorization: Basic header. — [source L53](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/wud/wud-integration.ts#L53)

**Remaining / follow-up:** Verify against WUD 9 and a reverse proxy that requires Basic auth, including invalid-credential error handling. Source evidence confirms the requested auth path is present.

### #6697 — feat: Use Tb / Gb for UNRAID Integration

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6697) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 defaults to decimal KB/MB/GB/TB units and lets each user select binary KiB/MiB/GiB/TiB when desired.

**Conversation (0 comments read):** No comments were present. The request asks Unraid values to match the UI's decimal TB/GB labels instead of binary TiB/GiB. V2's shared formatter changed the default to decimal and exposes an explicit per-user unit-system setting used by health widgets.

**V2 evidence:**

- packages/common/src/number.ts:19-31,54-60 — decimal and binary unit tables are defined, with decimal as the default and 1000 versus 1024 bases. — [source L19](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/common/src/number.ts#L19)
- packages/settings/src/byte-format.ts:9-18 — all byte/byte-pair/rate formatting reads the user's byteUnitSystem setting. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/settings/src/byte-format.ts#L9)
- apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/_general-settings-form.tsx:354-370 — user settings offer decimal KB/MB/GB and binary KiB/MiB/GiB choices. — [source L354](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/_general-settings-form.tsx#L354)
- packages/widgets/src/health-monitoring/system-health.tsx:218-220 — system disk values use the shared formatter rather than an Unraid-specific suffix. — [source L218](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/system-health.tsx#L218)
- packages/integrations/src/unraid/unraid-integration.ts:36-67 — Unraid values are passed as byte quantities for shared formatting. — [source L36](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L36)

**Remaining / follow-up:** Users who choose binary units will still see GiB/TiB by design. Verify the default setting in an upgraded installation and confirm the reported Unraid panel uses the shared formatter.

### #6671 — bug: Weather widget not displaying data

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6671) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 handles the intentional NO_EXTERNAL_CONNECTION case explicitly and includes the merged weather fix for disabled external connections.

**Conversation (3 comments read):** All three comments were read. The maintainer identified NO_EXTERNAL_CONNECTION=true and proposed #6674. The reporter confirmed they had enabled that flag and, after re-adding the widget, saw the clear outbound-connections-disabled message. Replacement fix #6780 is merged into V2. This resolves the misleading setup/error state, not a promise to fetch weather while outbound requests are disabled.

**V2 evidence:**

- packages/api/src/router/widgets/weather.ts:13-19 — the weather query returns null when outbound connections are intentionally disabled and otherwise uses the request handler. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/weather.ts#L13)
- packages/widgets/src/weather/component.tsx:27-39 — the widget handles null data and displays the translated disabled state. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/weather/component.tsx#L27)
- packages/translation/src/lang/en.json:3146-3148 — the user-facing message states that weather is unavailable because outbound connections are disabled. — [source L3146](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/translation/src/lang/en.json#L3146)
- packages/request-handler/src/weather.ts:17-77,142-147 — normal external weather requests have validated coordinates, timeout handling, and bounded five-minute widget caching. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/weather.ts#L17)

**Remaining / follow-up:** If outbound connections are enabled and a real location still returns no data, collect the provider response separately. Under NO_EXTERNAL_CONNECTION=true, no weather data is expected and the explanation is now explicit.

### #6600 — 🚀 Homarr v2 public beta is here! Join the testing

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6600) · **Other / tracking** · **Partially addressed** · Confidence: **high**

**Request:** V2 addresses many beta feedback items, but the umbrella conversation contains several unresolved or unverified subtopics that must remain separate.

**Conversation (29 comments read):** All 29 comments were read and split into subtopics. Addressed or substantially improved: login branding/background support, Header Studio/personal icon control, Beszel text scaling, bookmark density/compactness, migration guidance, world clocks in advanced Clock mode, and bounded performance work. Still unresolved or needing verification: repeated public demo login failures (the seed code can preserve an already altered account, but the live cause is unverified), compact-mode world-clock expectations, provider-specific Media Releases failures, direct Docker start/stop/pause affordances, final Bookmark title visibility/font-size controls (PR #6852 is open and unmerged), ultrawide max-column/centering behavior, and broad memory/performance endurance.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/auth/login/page.tsx:23-52 — v2 login reads branding and passes sign-in background image/overlay, logo, and app identity into the auth shell. — [source L23](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/auth/login/page.tsx#L23)
- packages/onboarding/src/onboarding-auth-shell.tsx:21-63 — the auth shell renders the configured background and overlay; packages/onboarding/src/onboarding-backdrop.tsx:5-13 still renders generic integration marquee rails rather than personal app icons. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/onboarding/src/onboarding-auth-shell.tsx#L21), [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/onboarding/src/onboarding-backdrop.tsx#L5)
- packages/api/src/trpc.ts:108-124 and packages/api/src/router/user.ts:466-471,497-503,526-531 — demo mode blocks username, deletion, and password mutations (subject to DEMO_READ_ONLY/global mode). — [source L108](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/trpc.ts#L108), [source L466](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/user.ts#L466)
- packages/db/migrations/seed.ts:918-935 — demo seeding skips an existing demo user, so a previously changed public demo password can persist; this explains why a live demo login still needs verification. — [source L918](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/seed.ts#L918)
- packages/widgets/src/clock/index.ts:133-139 and packages/widgets/src/clock/advanced-view.tsx:68-84,156-181 — worldClockCities are configurable and rendered in Advanced Clock mode; packages/widgets/src/clock/component.tsx:16-38 routes only advanced mode to that view. — [source L133](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/clock/index.ts#L133), [source L68](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/clock/advanced-view.tsx#L68), [source L16](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/clock/component.tsx#L16)
- packages/widgets/src/media-releases/component.tsx:39-78 and packages/definitions/src/widget-integration-map.ts:64-64 — Media Releases exists with loading/error/empty states for mock, Emby, Jellyfin, and Plex, but these lines do not prove a provider-specific runtime failure is fixed. — [source L39](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/media-releases/component.tsx#L39), [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/widget-integration-map.ts#L64)
- packages/widgets/src/bookmarks/index.tsx:12-53 and packages/widgets/src/bookmarks/bookmarks-widget.tsx:106-167 — v2 has hideTitle/layout/spacing/card-density controls and compact scaling, but the rendered widget title remains fixed at fz=11. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/bookmarks/index.tsx#L12), [source L106](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/bookmarks/bookmarks-widget.tsx#L106)
- packages/widgets/src/docker/component.tsx:218-240,285-318,493-602 — Docker actions are wired for start/stop/restart/remove and exposed through a dots menu; no pause action is present. — [source L218](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/docker/component.tsx#L218)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_layout.tsx:163-182 — custom layout columns are limited to 24 with no separate ultrawide max-column/centering policy. — [source L163](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_layout.tsx#L163)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:158-167 — release claims performance improvements and documents migration/compatibility notes. — [source L158](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L158)
- packages/request-handler/src/lib/request-handler.ts:28-39,128-145,232-269 and packages/api/src/query-cache.ts:21-65 — v2 bounds caches/inflight work and excludes large Beszel stats from persistence, supporting a mitigation claim rather than a soak proof. — [source L28](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/lib/request-handler.ts#L28), [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/query-cache.ts#L21)

**Remaining / follow-up:** Keep this umbrella partial. Track each outstanding item independently: (1) run the real public demo repeatedly and make seed/reset behavior deterministic; (2) verify world clocks in compact versus Advanced Clock modes; (3) reproduce Media Releases with the reporter's provider and inspect logs; (4) decide whether direct Docker controls need prominent buttons and add pause if required; (5) do not count open PR #6852 as present for bookmark title toggle/size; (6) verify ultrawide layout centering/max columns; and (7) run a long performance/memory soak.

### #6300 — bug: Memory leak

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6300) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 bounds several caches and fixes Beszel live-stream retention, but no causal link establishes that those changes resolve this broader retained Next.js memory report.

**Conversation (5 comments read):** All five comments were read. The original reporter lists media, download, calendar, weather, Dashdot iframe and Docker widgets, with retention after repeatedly opening/closing tabs. A later ARM64 report documents a multi-day plateau near 1.9 GB and uses Beszel as the external measurement source; that does not establish use of a Beszel live widget. Neither report isolates a subsystem.

**V2 evidence:**

- packages/api/src/router/widgets/bounded-async-queue.ts:8-15,28-40 — live snapshots use a bounded queue that discards old values when a slow client falls behind. — [source L8](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/bounded-async-queue.ts#L8)
- packages/api/src/router/widgets/beszel.ts:205-220,254-270 — each Beszel subscription installs an abort-linked bounded queue and closes it on cancellation/error. — [source L205](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/beszel.ts#L205)
- packages/widgets/src/beszel/_shared/use-live-stats.ts:9-21,30-72 — the browser keeps only a 60-record sliding buffer, stops hidden-page subscriptions, and clears buffers on key changes. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel/_shared/use-live-stats.ts#L9)
- packages/integrations/src/beszel/beszel-integration.ts:427-438,549-587 — SSE response bodies/readers/agents are cancelled and closed on normal completion, abort, and retry. — [source L427](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/beszel/beszel-integration.ts#L427)
- packages/request-handler/src/lib/request-handler.ts:28-39,113-145,232-269,317-337 — in-memory cache, inflight requests, and upstream work have explicit size/expiry/concurrency bounds. — [source L28](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/lib/request-handler.ts#L28)
- packages/api/src/query-cache.ts:21-35,36-65 — large Beszel system stats are excluded from persisted cache and supporting dashboard query policies are bounded. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/query-cache.ts#L21)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:158-160 — release-level performance claims cover parallel startup, lazy heavy screens, and deduplicated integration work. — [source L158](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L158)

**Remaining / follow-up:** Run a long RSS/heap retention reproduction using the reported widgets and repeated tab open/close lifecycle on the affected architectures. The cited bounded queues/caches are relevant improvements, not proof of even a partial fix for this particular cause.

### #6002 — bug: Uptime-Kuma, paused has no effect

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6002) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** The integration still derives monitor status from the latest public heartbeat and cannot reliably distinguish an intentionally paused monitor from a stale last heartbeat.

**Conversation (1 comments read):** The one comment was read. The reporter says pausing an Uptime Kuma monitor does not change Homarr's paused counter. The maintainer explains Homarr only consumes public status-page and heartbeat APIs, which omit the dashboard monitor active flag; a later v2 fix was reverted because it was ineffective. The public API limitation remains.

**V2 evidence:**

- packages/integrations/src/uptime-kuma/uptime-kuma-integration.ts:48-61 — v2 fetches only the public status page and heartbeat endpoints. — [source L48](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/uptime-kuma/uptime-kuma-integration.ts#L48)
- packages/integrations/src/uptime-kuma/uptime-kuma-integration.ts:64-81 — status is derived from the latest heartbeat, with no active/paused monitor field. — [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/uptime-kuma/uptime-kuma-integration.ts#L64)
- packages/integrations/src/uptime-kuma/uptime-kuma-types.ts:3-17,40-43 — the schema maps heartbeat states to up/down/paused and has no monitor active property. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/uptime-kuma/uptime-kuma-types.ts#L3)
- packages/widgets/src/uptime-kuma/component.tsx:112-130,218-238 — the widget displays the derived paused count and monitor badges without another source of truth. — [source L112](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/uptime-kuma/component.tsx#L112)

**Remaining / follow-up:** Use an authenticated Uptime Kuma API or an explicit integration option/endpoint that exposes active state, then verify paused monitors, stale heartbeats, and maintenance states separately. Do not call the reverted status mapping a fix.

### #5387 — feat: Pushover Integration

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5387) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has Gotify and ntfy notification integrations but no native Pushover integration.

**Conversation (3 comments read):** All 3 comments were read. The reporter asks for a Pushover notification integration; the maintainer requests details and receives no follow-up implementation specification. The issue was reopened by cleanup history, not fixed.

**V2 evidence:**

- packages/integrations/src/index.ts:22-25 — notification exports include Gotify and NTFY but no Pushover integration. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L22)
- packages/definitions/src/integration.ts:344-360 — the notification integration definitions contain ntfy and gotify only. — [source L344](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L344)
- packages/integrations/test/volumes/usenet/sabnzbd.ini:275-294 — the only Pushover references are Sabnzbd fixture settings, not Homarr integration code. — [source L275](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/test/volumes/usenet/sabnzbd.ini#L275)

**Remaining / follow-up:** Implement a native Pushover integration with token/user secrets, request validation, notification action semantics, and documentation.

### #4906 — feat: Top right UI Cleanup (concept video inside)

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4906) · **Quality of life** · **Partially addressed** · Confidence: **medium**

**Request:** V2 delivers a configurable header and board/command-menu redesign, but the concept issue is broad and hidden-header controls still rely on pointer/focus interaction rather than an explicit acceptance contract.

**Conversation (3 comments read):** All 3 comments were read. The issue is a concept video for cleaning up top-right controls. A reviewer specifically warns that core actions must not be mouseover-only and must remain usable by keyboard and touch; the maintainer says they are too busy to implement it but accepts contributions. Related #5272 remains unmerged.

**V2 evidence:**

- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:130-146 — v2 advertises customizable header zones plus a board switcher and command menu. — [source L130](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L130)
- apps/nextjs/src/components/layout/header/configurable-header.tsx:120-157 — header items render in zones and can be hidden, with mobile layout support. — [source L120](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/configurable-header.tsx#L120)
- apps/nextjs/src/components/layout/header/configurable-header.tsx:166-243 — hidden-header controls use pointer enter/leave plus focus capture/blur to reveal the floating controls. — [source L166](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/configurable-header.tsx#L166)
- apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/header-composer.tsx:145-185,206-214 — Header Studio supports add/remove/reorder and an explicit visible toggle. — [source L145](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/header-composer.tsx#L145)

**Remaining / follow-up:** Because the source request is a visual concept without exact acceptance criteria, keep this partial. Validate keyboard, touch, screen-reader, and hidden-header discoverability against the specific video expectations.

### #4797 — feat(releases): support image tags

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4797) · **Bugs** · **Partially addressed** · Confidence: **high**

**Request:** V2 queries Docker Hub tags and supports prefix/precision/suffix filters, but normalizes away an image tag and cannot express an exact pinned tag or flexible include/exclude regex.

**Conversation (6 comments read):** All 6 comments were read. The reporter says Docker images such as pihole/pihole work without a tag but :latest does not, and asks for a tag option plus include/exclude regex. Follow-ups discuss Docker Hub's tags endpoint and behavior without a filter; the old rework PR was merged but the exact tag/filter contract remains incomplete.

**V2 evidence:**

- packages/definitions/src/release-provider.ts:60-77 — Docker registry identifiers explicitly strip a digest or tag during normalization, so pihole/pihole:latest becomes the repository. — [source L60](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/release-provider.ts#L60)
- packages/widgets/src/releases/index.ts:48-75 — repository options expose only versionFilter with prefix, numeric precision, and suffix; no exact tag or include/exclude mode exists. — [source L48](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/releases/index.ts#L48)
- packages/api/src/router/widgets/releases.ts:18-32,88-102 — the server constructs an anchored precision regex and passes it to the provider request. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/releases.ts#L18)
- packages/request-handler/src/release-providers.ts:415-460 — Docker Hub requests paginated /tags and applies the regex to returned tag names. — [source L415](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/release-providers.ts#L415)
- packages/definitions/src/test/release-provider.spec.ts:21-30 — current tests codify stripping postgres:17 and other image tags from identifiers. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/test/release-provider.spec.ts#L21)

**Remaining / follow-up:** The tag endpoint and latest/no-filter path work for repository discovery, but exact image-tag selection and flexible include/exclude filters are still missing. Verify the reporter's :latest and desired tag semantics against a current Docker Hub repository.

### #4738 — bug: Dashboard Layout - Saving Changes Failure

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4738) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** V2 replaces the layout-save path, but the report affected only one existing board and its cause was not isolated. The new implementation alone does not prove that the specific Board not found failure or migrated board data is repaired.

**Conversation (4 comments read):** All 4 comments were read. The reporter describes v1.46 failing when adding a layout with Board not found in createBoardLayout, provides follow-up logs, removes bad integrations, and says the failure remains. No comment identifies a separate root cause beyond the layout-save path.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx:123-152 — layout saves return canonical layouts, reset dirty state, and revalidate the settings page. — [source L123](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx#L123)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_shared.tsx:15-22 — layout mutation settlement invalidates the board and home-board queries. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_shared.tsx#L15)
- packages/api/src/router/board.ts:1192-1206,1261-1289 — saveLayouts rereads the board, validates added/removed roles, creates custom layouts, and projects sections/items. — [source L1192](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1192)
- packages/validation/src/board.ts:102-131 — the responsive layout payload has strict Base/Mobile/unique-breakpoint validation. — [source L102](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/board.ts#L102)

**Remaining / follow-up:** No live reproduction or database migration test was run. Verify adding, resizing, and reloading a custom layout on a board upgraded from the affected v1 version.

### #4563 — feat: Generic Game Server Status Widget

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4563) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 still provides only a Minecraft-specific server status widget and has no native Gamedig/generic game-server integration.

**Conversation (3 comments read):** All 3 comments were read. The reporter requests a generic Gamedig-backed widget supporting hundreds of games and calls out Valheim, Terraria, and Vintage Story, with status, map, players, version, and configurable icon. The comments reinforce a native generic integration rather than a custom endpoint.

**V2 evidence:**

- packages/definitions/src/widget.ts:20-25 — the widget registry includes minecraftServerStatus but no generic game-server status kind. — [source L20](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/widget.ts#L20)
- packages/widgets/src/minecraft/server-status/index.ts:7-24 — the only server-status definition accepts title, domain, and isBedrockServer for Minecraft. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/minecraft/server-status/index.ts#L7)
- packages/widgets/src/minecraft/server-status/component.tsx:14-44,65-115 — rendering and API query are Minecraft-specific, including Minecraft icon/player semantics. — [source L14](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/minecraft/server-status/component.tsx#L14)
- packages/integrations/src/index.ts:1-50 — integration exports contain no Gamedig or generic game-server integration. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L1)

**Remaining / follow-up:** A native generic game-server protocol/client and widget remain unimplemented. Custom API/Custom Widget extensibility would not satisfy this native integration request.

### #4543 — feat: Edit apps inside Edit Item

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4543) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 embeds the AppForm as an App tab inside the widget edit modal and submits app changes with the widget form.

**Conversation (0 comments read):** No comments were present. The request asks for editing the linked app without leaving Edit Item, reducing clicks to change a URL. V2 contains an explicit in-place app-edit implementation.

**V2 evidence:**

- packages/widgets/src/modals/widget-edit-modal.tsx:393-417 — the modal detects an editable linked app and exposes a resource tab. — [source L393](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/modals/widget-edit-modal.tsx#L393)
- packages/widgets/src/modals/widget-edit-modal.tsx:452-466 — modal submission calls the embedded app form's submitIfDirty before saving the widget. — [source L452](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/modals/widget-edit-modal.tsx#L452)
- packages/widgets/src/modals/widget-edit-modal.tsx:681-697 — the App tab renders EmbeddedAppEditForm inside Edit Item. — [source L681](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/modals/widget-edit-modal.tsx#L681)
- packages/widgets/src/modals/embedded-app-edit-form.tsx:22-58,80-95 — the embedded form loads, updates, invalidates, and submits the selected app without separate navigation. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/modals/embedded-app-edit-form.tsx#L22)

**Remaining / follow-up:** No material gap for the stated request. Permission gating is intentional: the App tab appears only for users with app-modify-all.

### #4533 — feat: show Description next to title for application

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4533) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** The v2 App widget can render icon, title, and normal description in a horizontal row, with responsive sizing and truncation.

**Conversation (2 comments read):** Both comments were read. The request asks for an app description next to the title, with the icon on the left and title/description to its right; the old presentation stacked content. V2's app layout options include horizontal row modes and the component renders title and description together in the text stack.

**V2 evidence:**

- packages/widgets/src/app/index.ts:54-87 — App widget layout options include row and row-reverse in addition to column modes. — [source L54](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/app/index.ts#L54)
- packages/widgets/src/app/component.tsx:36-83 — row mode uses a horizontal Flex and renders title plus normal description in one Stack beside the icon. — [source L36](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/app/component.tsx#L36)
- packages/widgets/src/app/component.tsx:85-97 — the icon is a separate image element and the text supports line clamping. — [source L85](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/app/component.tsx#L85)

**Remaining / follow-up:** The default remains column layout, so users must choose a horizontal layout for this arrangement. Verify whether the reporter expected horizontal to become the default rather than an available option.

### #4190 — bug: Cannot integrate with OMV, Invalid system information response

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4190) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The OMV response-validation failure needs the actual payload to determine whether it persists in V2. Current code accepts a null CPU model name, but other system fields remain strict and the failing field was not identified.

**Conversation (7 comments read):** The reporter identified OMV 7.7.17-1 on a Raspberry Pi, with a successful connection test but a system-information schema error, and suspected null CPU values. Maintainers requested Discord debugging; another user suggested admin credentials. No failing payload or confirmation of that workaround appears in the seven comments.

**V2 evidence:**

- packages/integrations/src/openmediavault/openmediavault-integration.ts:30-53 — the integration safe-parses system information and returns the exact Invalid system information response error on schema mismatch. — [source L30](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/openmediavault/openmediavault-integration.ts#L30)
- packages/integrations/src/openmediavault/openmediavault-types.ts:3-20 — the schema requires version, numeric CPU/load fields, string memory fields, uptime, rebootRequired, and availablePkgUpdates. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/openmediavault/openmediavault-types.ts#L3)
- packages/integrations/src/openmediavault/openmediavault-integration.ts:70-90 — the widget-facing mapping depends on the parsed response and does not normalize alternate OMV versions. — [source L70](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/openmediavault/openmediavault-integration.ts#L70)
- packages/integrations/src/openmediavault/openmediavault-types.ts:7 + cpuModelName is already nullable; openmediavault-integration.ts:72 maps null to Unknown CPU. This contradicts a blanket claim that no null CPU response is supported, but does not establish which field failed. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/openmediavault/openmediavault-types.ts#L7)

**Remaining / follow-up:** Retrieve the failing System.getInformation payload and permissions on OMV 7.7.17-1, identify the exact schema mismatch, and compare it against V2. Do not label this fixed or definitely still failing solely from the generic error string.

### #3805 — bug: cache invalidation for board settings not working

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3805) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 saves board settings and layouts through a unified form, invalidates board/home queries, and rehydrates canonical layout values after saving.

**Conversation (1 comments read):** The one comment was read. The report describes adding/changing layouts that appear not to persist on an ultrawide Firefox board; the maintainer attributes it to stale board details/cache invalidation rather than only the form control. V2's unified settings work directly addresses that save/invalidation path.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx:123-152 — settings and layouts save together, canonical returned layouts reset the form, and the settings path is revalidated. — [source L123](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_settings-form.tsx#L123)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_shared.tsx:5-22 — settled partial-settings and layout mutations invalidate getBoardByName and getHomeBoard. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_shared.tsx#L5)
- packages/api/src/router/board.ts:1192-1206,1261-1289 — saveLayouts rereads the full board, detects additions/removals, and inserts projected layouts/placements. — [source L1192](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1192)
- packages/validation/src/board.ts:80-131 — layout validation enforces responsive roles, breakpoints, IDs, gutters, and the save payload. — [source L80](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/board.ts#L80)

**Remaining / follow-up:** The v2 code path is explicit, but no browser reproduction was run here. Verify persistence in the reported Firefox/ultrawide scenario after a reload and across another session.

### #3786 — feat: automatic service discovery

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3786) · **Integration requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 discovers Docker/Homepage-labeled services and offers assisted reconciliation, but does not automatically maintain a persistent discovered-services section/widget.

**Conversation (1 comments read):** The one comment was read. The request asks Homepage-style Docker labels for name, icon, href, group, description, integrations, and a discovered-services widget/section with filtering. V2 adds label discovery and onboarding/reconciliation workflows, which cover much of the data ingestion but require review/apply steps.

**V2 evidence:**

- packages/docker/src/labels.ts:1-21 — v2 defines homarr.* labels and Homepage-compatible group/name/href/icon/description labels. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/labels.ts#L1)
- packages/docker/src/discovery/parse-container-labels.ts:37-67 — labeled containers become typed discovered services with app, integration, widget, board, grouping, icon, description, and health metadata. — [source L37](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/discovery/parse-container-labels.ts#L37)
- packages/docker/src/discovery/list-discovered-containers.ts:17-40,50-67 — discovery enumerates running containers per Docker host and returns services. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/discovery/list-discovered-containers.ts#L17)
- packages/api/src/router/docker/docker-reconciliation.ts:18-33,40-127 — reconciliation compares discovered containers with persisted apps/integrations and produces candidates/next actions rather than silently creating dashboard entries. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/docker/docker-reconciliation.ts#L18)
- apps/nextjs/src/app/[locale]/manage/tools/docker/docker-reconciliation.tsx:69-85,115-228 — the v2 UI exposes an admin review inbox and explicit create/setup/review actions. — [source L69](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/docker/docker-reconciliation.tsx#L69)

**Remaining / follow-up:** The code does not create a continuously populated runtime discovered-services widget/section or the requested automatic filter. Confirm whether onboarding/admin-assisted setup is an accepted replacement; otherwise the persistent discovery presentation remains open.

### #3778 — feat(boards): configure default behaviour for open in new tab

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3778) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** V2 retains a per-app-widget openInNewTab switch, but has no board-level default for newly added apps.

**Conversation (1 comments read):** The one comment was read. The reporter asks for a board setting that controls whether clicking apps opens the same tab or a new tab by default, analogous to other board defaults. The current option remains attached to each app widget.

**V2 evidence:**

- packages/widgets/src/app/index.ts:20-25 — openInNewTab is an app widget option with defaultValue true, not a board setting. — [source L20](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/app/index.ts#L20)
- packages/widgets/src/app/component.tsx:141-148 — the anchor target is selected from the individual widget option. — [source L141](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/app/component.tsx#L141)
- packages/validation/src/user.ts:147-151 — the only nearby openInNewTab setting is a user search preference, not a board/app-click default. — [source L147](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/user.ts#L147)
- packages/widgets/src/bookmarks/index.tsx:47-52 — bookmarks also own a separate per-widget new-tab switch, reinforcing that no shared board default exists. — [source L47](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/bookmarks/index.tsx#L47)

**Remaining / follow-up:** Implement a board/user default and apply it when creating app widgets, while preserving explicit per-widget overrides for existing items.

### #3515 — feat: Personalize the upper right menu bar

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3515) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2's Header Studio supports per-user header item visibility, ordering, and placement across left, center, and right zones.

**Conversation (2 comments read):** Both comments were read. The request asks users to reorder individual upper-right controls and hide controls such as Docker, settings, theme, or board actions. V2 explicitly ships a customizable header and the implementation covers the requested controls and persistence.

**V2 evidence:**

- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:130-134 — the release describes choosing header buttons, changing their order, and placing them in left/center/right zones. — [source L130](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L130)
- apps/nextjs/src/components/layout/header/configurable-header.tsx:60-71,120-145 — the renderer consumes saved header zones and renders each zone separately on desktop/mobile. — [source L60](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/configurable-header.tsx#L60)
- apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/header-composer.tsx:121-165,167-185 — Header Studio lists inactive controls, adds/removes them, and supports drag reorder/moving between zones. — [source L121](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/header-composer.tsx#L121)
- packages/validation/src/header-preferences.ts:83-110,207-223 — preferences validate unique zones, retain account access, and define persisted defaults. — [source L83](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/header-preferences.ts#L83)

**Remaining / follow-up:** No material gap for the stated request. Verify the specific mobile/desktop arrangement only if the reporter expected separate per-device custom layouts.

### #3478 — feat(login): add possibility to specify forgot password link

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3478) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** The login page still shows the built-in CLI reset instruction and has no server setting for an external password-reset URL.

**Conversation (5 comments read):** All 5 comments were read. The reporter clarified that a server setting should replace the command-line reset-password details with a custom external link, for installations that delegate password recovery to another system. No comment indicates implementation or closure.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/auth/login/_login-form.tsx:194-220 — the forgot-password area hardcodes the homarr reset-password command and has no configurable href. — [source L194](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/auth/login/_login-form.tsx#L194)
- packages/server-settings/src/index.ts:5-16,42-55 — server setting keys and branding schema contain no forgot-password/reset URL field. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/server-settings/src/index.ts#L5)
- packages/server-settings/src/index.ts:127-157 — default settings likewise provide no password-recovery link configuration. — [source L127](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/server-settings/src/index.ts#L127)

**Remaining / follow-up:** Add a validated server-level URL and render it in the login form, while retaining a useful local-reset path when unset.

### #2495 — feat: Redirect to login page if not logged in

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2495) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** Anonymous users are redirected with a callback for some missing board paths, but existing public boards and management paths do not uniformly preserve the requested destination.

**Conversation (1 comments read):** The single comment was read. The reporter asked any board URL, including an invalid one, to send anonymous users to login and return them to the original URL after authentication; the comment broadened the usability request to /manage while acknowledging that anonymous endpoints are intentional.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/boards/(content)/_creator.tsx:48-64 — a missing board for an anonymous user redirects to /auth/login with a board callbackUrl, while authenticated missing boards return notFound. — [source L48](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/(content)/_creator.tsx#L48)
- apps/nextjs/src/app/[locale]/boards/_layout-creator.tsx:51-57 — the layout redirects anonymous missing-board cases to login without preserving a callback. — [source L51](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/_layout-creator.tsx#L51)
- apps/nextjs/src/app/[locale]/auth/login/page.tsx:23-28,60-65 — login sanitizes and forwards callbackUrl, defaulting to /. — [source L23](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/auth/login/page.tsx#L23)
- apps/nextjs/src/app/[locale]/manage/apps/page.tsx:42-46 — management pages use their own authentication redirects; the current route does not establish a universal callback-preserving guard. — [source L42](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/apps/page.tsx#L42)

**Remaining / follow-up:** Existing public boards intentionally render without login, and management routes do not consistently retain the original destination. Decide whether the desired policy is all boards/manage routes or only protected resources, then verify each route.

### #2480 — feat: fetch app icons automatically

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2480) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** The v2 app form still relies on icon search/entered URLs and does not fetch a site's HTML icon links with a favicon fallback.

**Conversation (0 comments read):** No comments were present. The requested behavior is to fetch a URL, parse link rel=icon or apple-touch-icon, then fall back to /favicon.ico, reducing manual icon selection. The related PR #6248 is closed without a merge and is not an ancestor of v2.

**V2 evidence:**

- packages/forms-collection/src/new-app/_form.tsx:130-145 — the app form passes an optional suggestedSearch to IconPicker based on the app name/href; it does not request page HTML. — [source L130](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/new-app/_form.tsx#L130)
- packages/forms-collection/src/icon-picker/icon-picker.tsx:80-88,128-133 — icon suggestions use direct image URLs/search terms, with no HTML link parsing or favicon fallback. — [source L80](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/icon-picker/icon-picker.tsx#L80)
- packages/forms-collection/src/icon-picker/icon-picker.tsx:253-270 — the preview only displays the selected URL and does not discover site icons. — [source L253](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/forms-collection/src/icon-picker/icon-picker.tsx#L253)

**Remaining / follow-up:** Native URL icon discovery and the requested fallback are absent. Do not count generic Custom Widget/API extensibility as resolving this app-form convenience.

### #2478 — feat: import / export apps

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2478) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** V2 has a full database backup archive, but not the requested selective standardized CSV/JSON app import/export.

**Conversation (0 comments read):** No comments were present. The issue asks for bulk app export/import in a portable CSV or JSON format, including app fields and categories, so users can move apps without moving all board data.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/manage/tools/backup/_components/backup-export-card.tsx:19-47 — the available export downloads a full homarr-backup.zip through the backup endpoint. — [source L19](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/backup/_components/backup-export-card.tsx#L19)
- apps/nextjs/src/app/[locale]/manage/tools/backup/_components/backup-import-card.tsx:10-24 — the import UI invokes DatabaseRestoreFlow for a database backup rather than an app-only interchange format. — [source L10](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/backup/_components/backup-import-card.tsx#L10)
- apps/nextjs/src/app/api/backup/export/route.ts:27-58 — the endpoint snapshots the complete SQLite database and returns a ZIP containing db.sqlite and metadata, not a selective app interchange file. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/backup/export/route.ts#L27)

**Remaining / follow-up:** A selective app export/import contract, including category/board mapping and validation, is still needed. Treat full backup restore as a different feature.

### #2160 — feat: Two proxmox on one TAB

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2160) · **Integration requests** · **Will be fixed with V2** · Confidence: **high**

**Request:** A single Health Monitoring widget now renders every selected Proxmox integration, addressing the report that choosing two standalone hosts displayed only the first.

**Conversation (2 comments read):** The reporter clarified in two comments that they wanted two separately configured Proxmox hosts in one widget rather than needing two widgets. They did not explicitly require merged totals or one synthesized Proxmox cluster. V2 maps all selected cluster integrations into panels within the same widget.

**V2 evidence:**

- packages/widgets/src/health-monitoring/component.tsx:18-42 — v2 partitions selected integrations and maps every clusterIntegrationId to a ClusterHealthMonitoring panel, including multiple panels in a scroll area. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/component.tsx#L18)
- packages/widgets/src/health-monitoring/component.tsx:44-64 — advanced mode can show system health beside the collection of cluster panels and compact mode exposes system/cluster tabs. — [source L44](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/component.tsx#L44)
- packages/api/src/router/widgets/health-monitoring.ts:64-77 — the cluster query is still made per integrationId, with no aggregate Proxmox endpoint. — [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/health-monitoring.ts#L64)
- packages/integrations/src/proxmox/proxmox-integration.ts:25-50 — each Proxmox integration continues to fetch its own resources. — [source L25](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/proxmox/proxmox-integration.ts#L25)

**Remaining / follow-up:** Confirm with the two standalone Proxmox servers. Per-host panels remain separate within the widget; aggregated totals were not an explicit requirement in this conversation.

### #2154 — feat: Re-add ability to use different port number

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2154) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** The v2 image still exposes the nginx entrypoint on 7575 and does not implement the requested internal PORT environment override.

**Conversation (7 comments read):** All 7 comments were read. The original report asked to restore PORT=80 or another configurable in-container port and described failures when using PORT=80 or 7575. The discussion distinguishes the Next.js 3000 port, websocket 3001, Redis 6379, and nginx proxy 7575; a PUID/PGID workaround fixed a separate nginx startup problem. No comment closes or changes the request for an internal configurable listener.

**V2 evidence:**

- Dockerfile:91-99 — the production image sets fixed database/runtime environment and EXPOSE 7575; no PORT setting is defined. — [source L91](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/Dockerfile#L91)
- nginx.conf:7-22 — nginx listens on 7575 and proxies normal traffic to 127.0.0.1:3000 and websockets to 3001. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/nginx.conf#L7)
- scripts/run.sh:35-49,80-84 — startup templates the fixed 7575 nginx listener and binds the standalone Next server to 0.0.0.0. — [source L35](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/scripts/run.sh#L35)

**Remaining / follow-up:** Host port mapping such as -p 80:7575 remains the operational workaround. Supporting PORT=80 inside the container would require coordinated nginx, health-check, documentation, and startup changes.

### #1921 — feat: Add titles and folding for Dynamic Sections

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/1921) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 replaces Dynamic Sections with Containers that provide editable labels, collapse controls, styling, and nested grouping.

**Conversation (10 comments read):** All 10 comments were read. The reporter asked for an editable section title and a fold button/setting, then follow-ups asked for side-by-side grouping, border color, custom CSS, opacity, and more predictable collapse behavior. The linked title, folding, and border-color subissues (#2233, #2234, and #2235) are closed. The v2 design consolidates this surface as Containers.

**V2 evidence:**

- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:79-85 — the release explains that Containers replace Groups and Dynamic Sections and can contain apps, widgets, and other Containers. — [source L79](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L79)
- apps/nextjs/src/components/board/sections/container-section.tsx:53-83 — v2 renders collapsible Containers and applies custom CSS classes and a custom border color. — [source L53](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/container-section.tsx#L53)
- apps/nextjs/src/components/board/sections/container-section.tsx:87-108 — the collapse control has expanded/collapsed state, accessible labels, and aria-controls. — [source L87](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/container-section.tsx#L87)
- packages/validation/src/shared.ts:57-77,81-102 — Container defaults/schema include title, borderColor, showLabel, collapsible, showOpenAll, and legacy Dynamic Sections transform to Containers. — [source L57](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/shared.ts#L57)

**Remaining / follow-up:** There is no dedicated opacity slider in the Container options, and the legacy transform only changes the section kind. Verify migrated boards if the opacity follow-up is still required.

