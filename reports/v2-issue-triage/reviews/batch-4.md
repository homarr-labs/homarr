# Batch 4 — 27 issue assessments

Reconciled assessment data. See [parent review notes](../PARENT-REVIEW.md) for subsequent corrections.

### #6811 — bug: Annoying scroll bar

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6811) · **Annoyances** · **Needs verification** · Confidence: **medium**

**Request:** The supplied Chrome crop confirms visible vertical and horizontal scrollbars in the header/banner area, but it does not identify their owning element; release/v2 still permits horizontal scrolling inside header zones, so banner removal alone cannot establish resolution.

**Conversation (2 comments read):** The complete body and both comments were read. The report is a low-impact Chrome-only observation from Homarr 1.77 with a screenshot, and says the bars remain after dismissing the version banner. The maintainer says the announcement banner will be removed in a later release and also notes only Firefox was tested. The saved crop visibly contains a vertical bar at the right and a horizontal bar along the bottom, but image evidence cannot determine whether the page or a header descendant owns either scroller. Current release/v2 CSS hides overflow on the outer header while desktop and mobile zones still set overflow-x:auto. No browser runtime check was performed, so source inspection cannot determine whether the exact bars persist after the banner is gone.

**V2 evidence:**

- reports/v2-issue-triage/source/6811.json:10-88 — complete issue body was read; it describes the Chrome screenshot, banner-dismissed observation, version, and low impact.
- reports/v2-issue-triage/source/6811.json:88-182 — both comments were read; they discuss removing the announcement banner and limited Firefox testing.
- reports/v2-issue-triage/source/attachments/6811-1.png — saved crop visibly shows a vertical scrollbar at the right and a horizontal scrollbar along the bottom of the cropped area, without establishing the DOM owner.
- apps/nextjs/src/components/layout/header/configurable-header.module.css:1-3,24-38 — the outer header hides overflow, while desktop zones allow horizontal overflow with overflow-x:auto. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/configurable-header.module.css#L1)
- apps/nextjs/src/components/layout/header/configurable-header.module.css:91-99; apps/nextjs/src/components/layout/header/configurable-header.tsx:110-146 — mobile zones also allow horizontal overflow and the component renders the desktop/mobile header zones. — [source L91](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/configurable-header.module.css#L91), [source L110](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/layout/header/configurable-header.tsx#L110)

**Remaining / follow-up:** Reproduce on the verified release/v2 revision in Chrome, inspect the owning scroll container and dimensions, and compare with the historical V1 screenshot. The V1 beta banner is not a V2 runtime fixture. If overflow remains, identify its cause before considering a fix.

### #6761 — bug: App Management Breaks w/o Modify All Boards Permission

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6761) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** Release/v2 derives app-management page access from app permissions, so a user with app-create or app-modify-all no longer needs the unrelated board-modify-all permission to load /manage/apps.

**Conversation (0 comments read):** The complete body and zero comments were read. The report says users who can create/use/modify apps receive Not Found unless they are also granted Modify All Boards, and the workaround over-scopes access. Current page code calls getAppsSectionAccess and only gates on its returned app access; the helper delegates to app permissions, with app-create or app-modify-all satisfying canAccess. The manage layout uses the same app-specific section access. This source path removes the board permission dependency described by the report. No runtime permission matrix was exercised in this source-only review.

**V2 evidence:**

- reports/v2-issue-triage/source/6761.json:10-88 — complete bug report was read; it describes the Not Found behavior, the app permissions held, and the over-broad board-permission workaround, with no comments.
- apps/nextjs/src/app/[locale]/manage/apps/page.tsx:42-55 — the app-management page calls getAppsSectionAccess and returns Not Found only when that app-specific access is absent. — [source L42](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/apps/page.tsx#L42)
- apps/nextjs/src/app/[locale]/manage/_access.ts:11-12 — the section-access wrapper delegates to the app-management access calculation rather than a board permission check. — [source L11](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/_access.ts#L11)
- packages/definitions/src/permissions.ts:231-236 — getAppManagementAccess makes canAccess true for app-modify-all or app-create, independently of board permissions. — [source L231](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/permissions.ts#L231)
- apps/nextjs/src/app/[locale]/manage/layout.tsx:70-95 — management navigation applies the same app-specific access model for the section. — [source L70](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/layout.tsx#L70)

**Remaining / follow-up:** Verify release/v2 with users holding each supported app permission combination and no board-modify-all permission, including direct navigation and management navigation visibility. Confirm unrelated app API actions still enforce their own permissions.

### #6745 — bug: Unraid health widget reports RAM in GiB approximately 1024x too small

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6745) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** Release/v2 computes Unraid memory usage from the byte-valued metrics total minus available, matching the correction requested for the roughly 1024x-too-small RAM ring.

**Conversation (0 comments read):** The complete body and zero comments were read. The report compares an Unraid 7.3.2 memory total with Homarr 1.76.1 showing approximately 1024 times less RAM and proposes calculating used memory as total minus available. Current release/v2 uses `systemInfo.metrics.memory.total` and `available`, clamps the subtraction at zero, and returns those byte values to the health widget. The GraphQL query requests the metrics fields directly and the schema validates non-negative numeric values. Merged PR #6781 is recorded as a release/v2 ancestor. This is source evidence for the correction; no live Unraid payload or release image was run during triage.

**V2 evidence:**

- reports/v2-issue-triage/source/6745.json:10-88 — complete bug report was read; it gives the 1024x discrepancy, Unraid version, and total-minus-available proposal, with no comments.
- reports/v2-issue-triage/source/linked-prs/6781.json:12,34-39,419 — merged PR #6781 addresses the Unraid health memory calculation and its merge commit is recorded as an ancestor of release/v2.
- packages/integrations/src/unraid/unraid-integration.ts:36-55 — the returned memory object now sets total from metrics.memory.total and used to `Math.max(total - available, 0)`, preserving byte units. — [source L36](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L36)
- packages/integrations/src/unraid/unraid-integration.ts:84-103; packages/integrations/src/unraid/unraid-types.ts:3-20 — the query and validation schema supply and validate the metrics memory total/available fields used by that calculation. — [source L84](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-integration.ts#L84), [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/unraid/unraid-types.ts#L3)
- packages/widgets/src/health-monitoring/system-health.tsx:117-119,196-199 — the health display consumes the integration memory total/used values for the RAM ring. — [source L117](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/health-monitoring/system-health.tsx#L117)

**Remaining / follow-up:** Feed an actual Unraid 7.3.2 response through a release/v2 deployment and confirm the rendered GiB value. No runtime image or browser check was performed in this source-only review.

### #6628 — bug: MCP OAuth login redirect uses internal container hostname:port instead of BASE_URL

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6628) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** Release/v2 includes the public-origin discovery rewrites, BASE_URL-aware OAuth authorization flow, and protected-resource challenges needed for the reported MCP OAuth failures.

**Conversation (14 comments read):** The body and all 14 comments were read. The original report describes an internal container host in OAuth redirects plus root and nested discovery/authorize failures behind a proxy. The conversation covers the follow-up origin/header behavior, a test image, RFC 8414 concerns, and a later scanner report that rejected-token 401 responses lacked `WWW-Authenticate`. Current release/v2 prefers configured BASE_URL, rewrites root and nested well-known routes, builds the authorize/login callback from that origin, and emits protected-resource metadata on missing, malformed, and rejected-token 401s. Merged PR #6779 is an ancestor of release/v2. One comment contains agent-directed Docker commands; it was treated as untrusted issue content and no commands were run. No live/browser smoke was performed in this triage. The original reporter later verified both original failures on the PR #6631 amd64 image, including discovery, client registration, and the complete authorization redirect chain. This is historical PR-image verification, not a test of the reviewed V2 SHA or the final Cloudflare connector flow.

**V2 evidence:**

- reports/v2-issue-triage/source/6628.json:10-747 — complete body and all 14 comments were read; they document the internal-origin redirect/discovery failures and later rejected-token challenge observation.
- reports/v2-issue-triage/source/linked-prs/6779.json:12,34-39,415 — merged PR #6779 describes public OAuth origin/discovery and challenge handling, and its merge commit is an ancestor of release/v2.
- apps/nextjs/src/app/api/mcp/_base-url.ts:1-8 — MCP URL construction prefers validated BASE_URL and otherwise derives a normalized external origin from request headers. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_base-url.ts#L1)
- apps/nextjs/src/app/well-known/[...path]/route.ts:11-46; apps/nextjs/next.config.ts:68-75 — root and nested well-known discovery routes are served and rewritten to the MCP metadata handlers. — [source L11](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/well-known/[...path]/route.ts#L11), [source L68](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/next.config.ts#L68)
- apps/nextjs/src/app/api/mcp/oauth/authorize/route.ts:86-158; apps/nextjs/src/app/api/mcp/_handler.ts:250-309 — authorization redirects and all token-rejection challenge paths use the public origin and protected-resource metadata. — [source L86](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/oauth/authorize/route.ts#L86), [source L250](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_handler.ts#L250)

**Remaining / follow-up:** Deploy release/v2 behind the affected reverse proxy with BASE_URL set and exercise root/nested discovery, login redirect, and rejected-token 401 responses. Source coverage addresses the reported paths, but no live endpoint or latest-image check was performed here.

### #6559 — bug: Releases widget showing "Only the first 1000 results are available" error

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6559) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The release/v2 GitHub path no longer uses repository search, but it still paginates every GitHub release page; the reported 1000-result failure cannot be classified without checking the exact endpoint response.

**Conversation (1 comments read):** The body and sole comment were read. The saved configuration screenshot identifies the GitHub provider, repository `home-assistant/home-assistant`, default `https://api.github.com`, and no filter; the comment says the bug still occurs in 1.76.2. Current release/v2 code obtains releases with Octokit `api.paginate` over `repos.listReleases`, then fetches repository details directly with `repos.get`. The direct details call rules out a current search endpoint in this path, while unbounded release pagination could still encounter a provider-side 1000-result cap. Source inspection therefore shows an improvement but cannot prove the configured repository no longer fails.

**V2 evidence:**

- reports/v2-issue-triage/source/6559.json:10-135 — complete body and one comment were read; the report names the 1000-result error and the comment says it persists in 1.76.2.
- reports/v2-issue-triage/source/attachments/6559-config.png — saved configuration screenshot shows GitHub, `home-assistant/home-assistant`, `https://api.github.com`, and no release filter.
- packages/request-handler/src/release-providers.ts:167-213 — the GitHub release provider calls `api.paginate` for `repos.listReleases` with `per_page: 100` and reduces the returned releases. — [source L167](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/release-providers.ts#L167)
- packages/request-handler/src/release-providers.ts:216-233 — repository details use direct `api.rest.repos.get`; no repository-search request appears in the current details path. — [source L216](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/release-providers.ts#L216)
- packages/definitions/src/release-provider.ts:3-8 — GitHub provider defaults to the public GitHub API URL shown in the report configuration. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/release-provider.ts#L3)

**Remaining / follow-up:** Run release/v2 against the exact repository or a mocked GitHub API that exercises the endpoint beyond 1000 results. If `listReleases` is capped, bound or redesign pagination to obtain the latest releases without traversing the capped history; otherwise capture the actual failing request and payload.

### #6438 — bug: OOM with 1.71.0

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6438) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** Release/v2 contains the relevant Beszel live-stream cleanup, bounded subscription queue, and client buffer trimming, but the reported dashboard-wide OOM under a 1.5 GB cap remains unverified.

**Conversation (4 comments read):** The body and all four comments were read. The report describes Homarr reaching its 1.5 GB limit while a dashboard combines Docker data with Beszel Live data, and later discussion mentions desktop/mobile use and multiple live views. The conversation never isolates a reproducible leak or confirms a post-fix retest. Merged PR #6448 is a release/v2 ancestor and its current source closes the Beszel SSE response/agent on disconnect, bounds pending events, and trims the one-minute client buffer. Those changes address a credible live-subscription growth path, while the broader process OOM and other widgets remain unproven.

**V2 evidence:**

- reports/v2-issue-triage/source/6438.json:70-334 — complete issue body and four comments were read; it reports the memory cap/OOM scenario and does not provide a confirmed leak trace or post-fix result.
- reports/v2-issue-triage/source/linked-prs/6448.json:12,34-39,415 — PR #6448 describes the Beszel live memory-growth fix and its merge commit is recorded as an ancestor of release/v2.
- packages/integrations/src/beszel/beszel-integration.ts:407-590 — the live SSE reader uses abort handling, closes response bodies and the undici agent, and bounds retry behavior on disconnect. — [source L407](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/beszel/beszel-integration.ts#L407)
- packages/api/src/router/widgets/beszel.ts:198-293; packages/api/src/router/widgets/bounded-async-queue.ts:8-88 — live subscriptions use abort cleanup and a queue that caps pending events and discards the oldest item when full. — [source L198](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/beszel.ts#L198), [source L8](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/bounded-async-queue.ts#L8)
- packages/widgets/src/beszel/_shared/use-live-stats.ts:9-76 — the client keeps a maximum one-minute buffer and trims older live samples, pausing updates when the page is hidden. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel/_shared/use-live-stats.ts#L9)

**Remaining / follow-up:** Reproduce the exact Docker-plus-Beszel dashboard with multiple tabs/views and the 1.5 GB limit on release/v2 while recording process memory. If OOM persists, isolate Docker, app prefetch, or another subscription path separately from the fixed Beszel stream.

### #6392 — feat: Switch Board via keyboard shortcut

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6392) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** Release/v2 offers a Shift+C board-switcher modal with keyboard navigation, but it does not provide the requested global next/previous shortcuts or numbered per-board shortcuts.

**Conversation (0 comments read):** The issue body and its zero comments were read. The request asks for Ctrl/Cmd+Shift+1,2,... shortcuts and, at minimum, Ctrl/Cmd+Shift+>/< cycling between boards. Timeline PR #6393 describes those shortcuts but targets dev and is not a release/v2 source fix. Current code provides a related Shift+C gallery and arrow navigation only after that modal is open; it does not cycle boards directly from any board and has no persisted per-board shortcut setting. The existing gallery reduces the request, but does not implement the requested shortcut behavior.

**V2 evidence:**

- reports/v2-issue-triage/source/6392.json:10-88 — complete feature request was read; it asks for numbered board shortcuts and next/previous cycling, with no comments.
- apps/nextjs/src/components/board/board-switcher.tsx:37-44,50-107 — the only registered global board shortcut is Shift+C, which opens the switcher and loads boards. — [source L37](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/board-switcher.tsx#L37)
- apps/nextjs/src/components/board/board-switcher.tsx:119-173,316-335 — arrows navigate the open modal and links select a board; no global next/previous or numbered shortcut handler is present. — [source L119](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/board-switcher.tsx#L119)
- packages/definitions/src/hotkeys.ts:1-10 — the global hotkey definitions contain no board-switching entries. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/hotkeys.ts#L1)
- reports/v2-issue-triage/source/linked-prs/6393.json:10-39,415 — the referenced PR proposes the requested shortcuts but its metadata marks the merge commit as not an ancestor of release/v2.

**Remaining / follow-up:** Implement and document guarded global next/previous and numbered or persisted per-board shortcuts, then verify them on release/v2 across typing contexts and board counts.

### #6254 — feat: aMule

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6254) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has no native aMule integration definition, client, creator, widget mapping, or documentation.

**Conversation (0 comments read):** The issue body and its zero comments were read. The requester links the aMule project, says its built-in API exposes the data, asks for an integration, and says they will not contribute it. The current v2 registry contains many download clients, but no aMule entry or native implementation. A generic app link or Custom Widget could expose a user-specific endpoint, yet it does not provide the requested selectable native integration and widget behavior.

**V2 evidence:**

- reports/v2-issue-triage/source/6254.json:10-88 — the complete request was read; it identifies aMule, its project URL, API availability, and no comments or contributor implementation.
- packages/definitions/src/integration.ts:58-584 — the complete v2 integration definition registry includes supported download clients but no amule/aMule integration kind. — [source L58](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L58)
- packages/integrations/src/base/creator.ts:9-115 — the creator map is exhaustive over IntegrationKind and has no aMule factory or client import. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/creator.ts#L9)
- packages/integrations/src/index.ts:1-49 — exported native integrations list no aMule implementation for widgets or API consumers. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L1)
- packages/widgets/src/registry.ts:1-40 — widget registration is tied to concrete widget kinds and integration support, with no aMule widget entry. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/registry.ts#L1)

**Remaining / follow-up:** Add an aMule integration kind, authenticated API client and response contract, relevant widget options/rendering, integration mapping, permissions, and documentation. A generic link or Custom Widget remains a workaround rather than native support.

### #6155 — feat: re-open: Transfer to the existing Dashdot graphs?  #5964

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6155) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** Beszel has its own compact Mantine chart panels, but its values are not routed through the existing Dashdot CommonChart component requested by the follow-up.

**Conversation (2 comments read):** All 2 comments were read. The original request says Beszel charts consume too much vertical space and look jagged in a compact dashboard, asking to reuse Dashdot's graph rendering. The maintainer asks for a simpler demand because Beszel changed; the reporter clarifies that the feature is done only when Beszel values can be plugged into or viewed within Dashdot graphs. Current v2 improves Beszel's own chart sizing and responsive panel layout, but the implementation remains separate: BeszelStatsView renders BeszelChartPanel, whose chart wrapper configures AreaChart directly, while Dashdot's System Resources widgets import a distinct CommonChart and transform Dashdot-specific history. No adapter or shared renderer accepts Beszel data in the Dashdot path.

**V2 evidence:**

- reports/v2-issue-triage/source/6155.json:10-70,88-182 — the full request and both comments were read; the final comment defines success as Beszel values displayed within Dashdot's graphs.
- packages/widgets/src/beszel/_shared/chart.tsx:96-164 — BeszelChartPanel owns a BeszelAreaChart built directly from Mantine AreaChart with its own axes, styles, and chart props. — [source L96](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel/_shared/chart.tsx#L96)
- packages/widgets/src/beszel/_shared/stats-view.tsx:292-407 — all CPU, memory, disk, I/O, network, and Docker panels render BeszelChartPanel rather than the system-resources chart component. — [source L292](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/beszel/_shared/stats-view.tsx#L292)
- packages/widgets/src/system-resources/chart/common-chart.tsx:29-55,207-223 — Dashdot/System Resources uses a separate CommonChart abstraction that chooses LineChart or AreaChart and expects its own data/series contract. — [source L29](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-resources/chart/common-chart.tsx#L29)
- packages/widgets/src/system-resources/chart/network-traffic.tsx:7-43 — the Dashdot chart adapter receives numeric usageOverTime values and calls CommonChart; no Beszel integration or data adapter is imported. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-resources/chart/network-traffic.tsx#L7)

**Remaining / follow-up:** Introduce a shared chart data contract or an explicit Beszel-to-Dashdot adapter, then expose the requested compact renderer while preserving Beszel-specific metrics and units. Beszel's separate responsive charts partially improve compactness but do not satisfy the stated reuse criterion.

### #6024 — bug: SyntaxError: Expecting Unicode escape sequence \uXXXX (1:10901)

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6024) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The report's parser exception has no confirmed causal fix in release/v2. V2 normalizes JSON SyntaxErrors from decorated integration methods, but the logged `\uXXXX (1:10901)` shape is consistent with a JavaScript parser and no source identifies that path.

**Conversation (0 comments read):** The issue body and its zero comments were read. The reporter sees a recurring Unicode-escape SyntaxError with low visible impact and suspects an empty Beszel integration, but provides no reproduction or endpoint payload. A later triage PR considered wrapping only Beszel authentication JSON, then removed that narrow change because the report points to collection responses. The current generic integration boundary can normalize JSON parse failures, and Beszel response.json calls run inside it, but that does not establish that the reported parser exception came from JSON.parse or from Beszel. The linked narrow PR is not a release/v2 ancestor, so disposition remains unproven.

**V2 evidence:**

- reports/v2-issue-triage/source/6024.json:10-88 — the complete body was read; it reports the recurring malformed Unicode escape, possible empty Beszel data, low impact, and no comments or reproduction steps.
- packages/integrations/src/base/errors/decorator.ts:22-25,90-169 — all Integration methods are wrapped and rejected errors pass through the default JSON parse handler before being rethrown as normalized integration errors. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/errors/decorator.ts#L22)
- packages/integrations/src/base/errors/parse/integration-parse-error-handler.ts:8-21 — SyntaxError values are converted into IntegrationParseError through JsonParseErrorHandler rather than remaining raw exceptions. — [source L8](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/errors/parse/integration-parse-error-handler.ts#L8)
- packages/common/src/errors/parse/handlers/json-parse-error-handler.ts:4-17 — the JSON handler recognizes SyntaxError, logs the parse message, and creates a ParseError cause. — [source L4](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/common/src/errors/parse/handlers/json-parse-error-handler.ts#L4)
- packages/integrations/src/beszel/beszel-integration.ts:253-278,598-618 — Beszel collection and auth testing calls still call response.json, but those methods run under the decorated Integration boundary. — [source L253](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/beszel/beszel-integration.ts#L253)
- packages/api/src/router/widgets/beszel.ts:31-63,168-195 — Beszel system and stats routes convert integration failures into public error results instead of propagating a process-level uncaught exception. — [source L31](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/beszel.ts#L31)
- reports/v2-issue-triage/source/linked-prs/6510.json:34-39,437 — the later PR explicitly removed its narrow Beszel wrapper and records its merge commit as not an ancestor of release/v2; this metadata is context only, while the current source above supplies the disposition evidence.

**Remaining / follow-up:** Capture the complete stack, parser, and malformed payload on release/v2 if the recurring log is still observed. Identify whether the failure is JSON parsing, JavaScript/Acorn parsing, or another upstream path before adding a targeted fix or fixture.

### #5730 — bug: Administration menu breaks if you click around the options too much

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5730) · **Bugs** · **Partially addressed** · Confidence: **high**

**Request:** The current logs terminal disposes the CanvasAddon before the terminal, covering the reported xterm cleanup failure, but the reported Scalar API error and WebSocket process crash have no corresponding release/v2 source fix.

**Conversation (7 comments read):** All 7 comments were read. The report combines three failures after rapid administration-menu navigation: repeated WebSocket failures that eventually stop the server, Scalar's `refract is not a function` with broken API dropdowns, and xterm's onShowLinkUnderline error while leaving logs. The reporter traces the WebSocket problem to tRPC's observableToReadableStream and proves local try/catches prevent crashes; they also identify CanvasAddon disposal as the logs race. A maintainer later says it should be fixed but receives no confirmation. Current v2 cleanup clears the fit timer, disposes CanvasAddon, then disposes and clears the terminal ref. The API page still renders @scalar/api-reference-react without a compatibility guard, and the WebSocket entrypoint still delegates to applyWSSHandler without stream-controller protection.

**V2 evidence:**

- reports/v2-issue-triage/source/5730.json:10-92,110-440 — the full report and all seven comments were read; the conversation explicitly splits the WebSocket, Scalar, and xterm errors and has no reporter confirmation after the maintainer's fix claim.
- apps/nextjs/src/app/[locale]/manage/tools/logs/terminal.tsx:174-205 — the logs component clears its delayed fit callback and disposes CanvasAddon before Terminal, then clears both refs, addressing the specific disposal order implicated by the xterm stack. — [source L174](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/logs/terminal.tsx#L174)
- apps/nextjs/src/app/[locale]/manage/tools/api/components/scalar-api-reference.tsx:1-35 — the API page still imports and renders ApiReferenceReact directly, with no refract compatibility handling or fallback. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/api/components/scalar-api-reference.tsx#L1)
- apps/nextjs/src/app/[locale]/manage/tools/api/page.tsx:51-80 — administration API documentation still mounts the Scalar component as its documentation panel. — [source L51](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/api/page.tsx#L51)
- apps/websocket/src/main.ts:34-71 — the WebSocket server still uses applyWSSHandler with keep-alive settings and has no local handling around the readable-stream controller operations described in the issue. — [source L34](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/websocket/src/main.ts#L34)

**Remaining / follow-up:** Verify logs navigation on release/v2, then independently reproduce the Scalar dependency error and tRPC stream shutdown. Upgrade or isolate incompatible Scalar/tRPC behavior and add a server-safe close path if those two failures remain; the xterm source change alone does not close the compound report.

### #5085 — bug: Unable to connect to LDAP

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5085) · **Bugs** · **Needs verification** · Confidence: **medium**

**Request:** The initial LLDAP failure was a bind-DN configuration mistake corrected in the thread, while the separate Authentik LDAP Outpost failure remains unresolved and has no release/v2-specific fix or fixture.

**Conversation (8 comments read):** All 8 comments were read. The original Docker Compose example uses cn=admin even though the returned LLDAP entry has uid=admin; the reporter confirms changing the bind DN to that returned DN makes LLDAP login work. They then reproduce a different failure against Authentik, using a correct bind DN, sAMAccountName, subtree search, and an objectClass filter; ldapsearch from the Homarr container returns one user, but Homarr still returns CredentialsSignin. The maintainer questions the search scope, the reporter tests it and reports no change, then supplies base and subtree queries showing the expected Authentik user. Current v2 supports the requested username attribute, search scope, and optional extra filter, but there is no Authentik-specific handling or end-to-end evidence that those settings authorize successfully.

**V2 evidence:**

- reports/v2-issue-triage/source/5085.json:10-112,130-507 — the full report and all eight comments were read; the thread separates the corrected LLDAP bind DN from the still-failing Authentik case and includes the later base/subtree ldapsearch output.
- packages/auth/providers/credentials/authorization/ldap-authorization.ts:17-54 — login binds with AUTH_LDAP_BIND_DN, searches with configured base, username filter, scope, and attributes, and rejects zero or multiple matches. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/ldap-authorization.ts#L17)
- packages/auth/providers/credentials/authorization/ldap-authorization.ts:81-95,141-148 — group lookup uses the configured scope and the username filter extra argument is interpolated as a caller-supplied LDAP filter expression. — [source L81](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/ldap-authorization.ts#L81)
- packages/auth/env.ts:55-69 — release/v2 exposes AUTH_LDAP_SEARCH_SCOPE, AUTH_LDAP_USERNAME_ATTRIBUTE, username/group filter extras, and group mapping settings needed for the reported Authentik schema. — [source L55](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/env.ts#L55)
- packages/auth/providers/credentials/ldap-client.ts:18-56 — the client passes the configured URI and ldapts search options through without provider-specific Authentik normalization. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/ldap-client.ts#L18)
- apps/docs/docs/advanced/single-sign-on/index.mdx:103-118 — the documented LDAP contract expects a parenthesized extra filter and supports base/one/sub scopes, so malformed filter syntax remains a configuration variable to verify. — [source L103](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/single-sign-on/index.mdx#L103)

**Remaining / follow-up:** Reproduce the Authentik setup on the release/v2 image with the documented parenthesized extra filter and capture Homarr's search/bind result, then add provider-compatible handling or documentation if the one-entry ldapsearch case still fails. Do not treat the LLDAP configuration correction as resolution of the Authentik failure.

### #4815 — feature: Seed the database with a showcase default dashboard using the new JSON import endpoint

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4815) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 implements the requested in-dashboard integration workflow, while ordinary fresh-install seeding still creates a small generic board rather than the requested static showcase dashboard.

**Conversation (0 comments read):** The issue body and its zero comments were read. It contains two distinct scopes: a fresh-install showcase board with no-integration examples, documentation links, multiple clocks, Docker/system widgets, Homarr releases, and an NVDA note; and an in-place widget workflow that selects an available integration or opens integration creation without navigating away. The normal seed path creates one dashboard and places only the default clock, weather, and bookmarks configurations, with basic default apps/search engines. A large demo dashboard exists only when DEMO_MODE is enabled; it includes a notebook and many showcase widgets, but many entries intentionally require a mock integration and it is a separate demo user/board. The widget-add flow now selects matching integrations and opens the integration modal inline when none exists; the widget edit modal can also create and select a new integration. The combined request is therefore only partially addressed.

**V2 evidence:**

- reports/v2-issue-triage/source/4815.json:10-85 - the complete issue body was read; it explicitly contains both the showcase-seed and in-place integration scopes, with no comments.
- packages/db/migrations/seed.ts:50-71 - normal seeding creates default search engines/apps/board/widgets, while the expanded demo user/board runs only when DEMO_MODE is truthy. — [source L50](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/seed.ts#L50)
- packages/definitions/src/widget-integration-map.ts:195-199,222-243 - the ordinary default board config contains only clock, weather, and bookmarks, and the seeded bookmark apps are four basic Homarr/support links. — [source L195](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/widget-integration-map.ts#L195)
- packages/db/migrations/seed.ts:314-366 - default search engines are Google, YouTube, and Homarr Docs; no DashboardIcons search engine is seeded. — [source L314](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/seed.ts#L314)
- packages/db/queries/widget-placement.ts:88-156 - ordinary placement derives widgets from configured integrations/apps and defaultWidgetConfigs rather than loading a static showcase JSON configuration. — [source L88](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/queries/widget-placement.ts#L88)
- packages/db/migrations/seed.ts:589-649,651-672,772-806,959-965,1067-1095 - DEMO_MODE provides a broad notebook/widget gallery and mock integration, but several demo entries are marked needsIntegration and are inserted into a separate demo board. — [source L589](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/migrations/seed.ts#L589)
- apps/nextjs/src/components/board/items/item-select-modal.tsx:307-410 - adding a widget selects up to the available matching integrations and, when a required kind is absent, opens IntegrationSelectModal before opening the widget editor. — [source L307](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/items/item-select-modal.tsx#L307)
- apps/nextjs/src/components/board/items/lazy-widget-edit-modal.tsx:131-176; packages/widgets/src/modals/widget-edit-modal.tsx:488-495,564-573 - widget editing can create a supported integration in a modal and immediately add its ID to the widget integration selection. — [source L131](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/items/lazy-widget-edit-modal.tsx#L131), [source L488](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/modals/widget-edit-modal.tsx#L488)

**Remaining / follow-up:** Add or explicitly ship a standard fresh-install showcase configuration with the requested no-integration widgets, clock locations, stock note, links/search engine, and verified defaults; clarify whether DEMO_MODE is the intended showcase entry point. The in-place selection/creation workflow has no remaining source-level gap, but its integrated behavior was not live-tested.

### #4538 — bug: iCal widget intergration not working

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4538) · **Bugs** · **Not addressed** · Confidence: **high**

**Request:** V2's iCal adapter still fetches the remote feed on demand, emits raw VEVENT instances, and has no recurrence expansion or durable stale-data fallback for feeds blocked by providers.

**Conversation (1 comments read):** The issue body and its 1 comment were read. The reporter says an iCloud public feed works briefly, is then blocked after too many requests, and omits recurring events. The comment proposes synchronizing and storing calendar data locally. V2's iCal integration fetches the configured URL for each request, parses each VEVENT directly, and returns its DTSTART/DTEND without iterating RRULE occurrences. The calendar request handler has only the generic 10-second cache because no iCal-specific TTL or stale-on-error policy is configured; the calendar router returns an integration error when all sources fail. Thus neither the provider-blocking failure mode nor the recurring-event omission is resolved at source level.

**V2 evidence:**

- reports/v2-issue-triage/source/4538.json:10-79,97-145 - the full iCloud failure/recurrence report and the synchronization comment were read.
- packages/integrations/src/ical/ical-integration.ts:12-38 - each request fetches the configured URL, loops raw VEVENT subcomponents, and emits only each event's start/end; no recurrence iterator or expansion is present. — [source L12](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/ical/ical-integration.ts#L12)
- packages/request-handler/src/calendar.ts:17-29 - calendarMonthRequestHandler sets only cacheNamespace and its request function, with no cacheTtlMs or fallbackToStaleOnError for iCal. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/calendar.ts#L17)
- packages/request-handler/src/lib/request-handler.ts:31-33,240-269,318-349 - the generic cache defaults to 10 seconds and stale-on-error is opt-in, so this path has no durable feed snapshot when an upstream blocks it. — [source L31](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/lib/request-handler.ts#L31)
- packages/api/src/router/widgets/calendar.ts:29-60 - calendar responses fall back to empty events per integration but throw when all integrations fail, leaving a blocked sole iCal feed unusable. — [source L29](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/calendar.ts#L29)
- packages/integrations/src/interfaces/calendar/calendar-integration.ts:3-4 - the calendar interface carries a date range but no recurrence or synchronization contract. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/interfaces/calendar/calendar-integration.ts#L3)

**Remaining / follow-up:** Implement feed synchronization or a longer, bounded cache with stale fallback/backoff, expand RRULE events within the requested range with timezone handling, and add focused iCal tests for blocked feeds and recurrence.

### #4455 — feat: Ability to disable users without deleting them.

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4455) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** V2 has no persisted disabled-user state, admin toggle, or authentication/session enforcement for disabling an account.

**Conversation (3 comments read):** All 3 comments were read. The requester wants an admin-only toggle to block service accounts such as Authentik or LDAP search users while leaving those accounts available to other services. One maintainer suggests using the identity provider instead; a later comment says a Homarr-side implementation is reasonable for credentials users if login, API keys, and sessions are revoked. Current v2 source has no disabled column, user-list status/action, or checks in credentials, LDAP, or session handling. Linked PR #6214 describes this feature but is open/draft metadata and is not evidence of the current release/v2 source.

**V2 evidence:**

- reports/v2-issue-triage/source/4455.json:10-81,99-241 - the full request and all three comments were read, including the identity-provider discussion and proposed session behavior.
- packages/db/schema/sqlite.ts:48-75 - the v2 user table has provider, preferences, and board fields but no disabled/status column. — [source L48](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/db/schema/sqlite.ts#L48)
- packages/auth/providers/credentials/authorization/basic-authorization.ts:13-39 - credentials authorization finds the user and checks the password without a disabled predicate. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/basic-authorization.ts#L13)
- packages/auth/providers/credentials/authorization/ldap-authorization.ts:101-139 - LDAP users are queried or created and returned without a disabled check. — [source L101](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/credentials/authorization/ldap-authorization.ts#L101)
- packages/auth/callbacks.ts:38-60 - the session callback reloads colorScheme and permissions only, with no disabled-session invalidation. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/callbacks.ts#L38)
- apps/nextjs/src/app/[locale]/manage/users/_components/user-list.tsx:19-75 - the admin table shows name/email and has row actions disabled, with no status or disable control. — [source L19](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/users/_components/user-list.tsx#L19)
- reports/v2-issue-triage/source/linked-prs/6214.json:10-39 - the linked change remains open/draft metadata; its description is not treated as implementation evidence.

**Remaining / follow-up:** Add a migration-backed disabled flag, admin-only enable/disable mutation and UI, and enforcement across every authentication method, API-key issuance/use, and active-session validation. Define behavior for external-provider users before implementing.

### #4361 — feat(media-releases): support selection of user for library fetching

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4361) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** The Emby Media Releases widget still has no user-selection option and still chooses the first public Emby user for latest-media queries.

**Conversation (3 comments read):** All 3 comments were read. The original report describes a new Emby Media Releases item failing with No users found. A maintainer explains that the implementation fetches public users and takes the first one; the reporter fixes the immediate error by enabling an Emby public user. The final comment changes the issue into a feature request for selecting the library user, referencing the dynamic select work. V2 retains the first-public-user behavior and passes only integration IDs through the widget and request handler. The workaround resolves the reporter's configuration error but does not implement the requested per-widget user choice or provide a graceful no-public-user path.

**V2 evidence:**

- reports/v2-issue-triage/source/4361.json:10-79,97-239 - the full bug report and all three comments were read, including the public-user workaround and feature-request change.
- packages/integrations/src/emby/emby-integration.ts:224-245 - getMediaReleasesAsync fetches public users, selects users.at(0)?.id, and throws No users found when the list is empty. — [source L224](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/emby/emby-integration.ts#L224)
- packages/integrations/src/emby/emby-integration.ts:290-308 - the user list is fetched from /Users/Public and mapped to IDs/names, with no selected-user input. — [source L290](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/emby/emby-integration.ts#L290)
- packages/widgets/src/media-releases/index.ts:8-39, packages/widgets/src/media-releases/component.tsx:39-53 - the widget options and query contain layout/display settings and integrationIds only, with no user field. — [source L8](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/media-releases/index.ts#L8), [source L39](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/media-releases/component.tsx#L39)
- packages/request-handler/src/media-release.ts:7-17, packages/api/src/router/widgets/media-release.ts:10-17 - the request input is an empty record and always invokes the integration without a user selection. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/request-handler/src/media-release.ts#L7), [source L10](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/widgets/media-release.ts#L10)

**Remaining / follow-up:** Expose a validated Emby user option through the widget settings, request handler, and integration method; list users with appropriate permissions and handle an empty or deleted selection without throwing an opaque integration error.

### #4143 — feat: separate region from language

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4143) · **Quality of life** · **Not addressed** · Confidence: **high**

**Request:** V2 still couples display localization to the selected language and has no independent persisted user region or timezone preference.

**Conversation (2 comments read):** All 2 comments were read. The requester wants English UI text while retaining a Swedish/local region so calendar and release times are easier to read. A maintainer asks whether the change is wanted; another member agrees but notes possible localization-library difficulty. Current v2 user preferences expose locale, first day of week, and byte units, but no region or timezone field. Day.js loads its locale from the route language, while the clock defaults to the browser's resolved timezone unless each widget has a custom timezone. This does not provide the requested user-level separation or guarantee that integrated calendar formatting follows a chosen region.

**V2 evidence:**

- reports/v2-issue-triage/source/4143.json:10-81,99-194 - the full request and both comments were read; the request explicitly separates English language from local region/time display.
- packages/settings/src/preferences/definitions.ts:1-10,31-44 - user preferences define locale, firstDayOfWeek, and byteUnitSystem but no region/timezone preference. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/settings/src/preferences/definitions.ts#L1)
- apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/_general-settings-form.tsx:53-65,334-370 - the profile form offers language and calendar week-start controls, with no region or timezone setting. — [source L53](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/users/[userId]/general/_components/_general-settings-form.tsx#L53)
- packages/translation/src/dayjs.ts:16-27 - Day.js localization is selected from the current route locale, so language and date locale remain coupled. — [source L16](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/translation/src/dayjs.ts#L16)
- packages/widgets/src/clock/component.tsx:16-23, packages/widgets/src/clock/world-clock.ts:64-67 - a clock can use an individual custom timezone, otherwise it resolves the browser timezone; neither is a persisted region preference. — [source L16](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/clock/component.tsx#L16), [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/clock/world-clock.ts#L64)

**Remaining / follow-up:** Add a persisted independent locale/region or timezone preference and apply it consistently to calendar dates, release times, and default clock behavior. Keep the per-widget timezone override as a more specific setting.

### #3990 — feat: Allow one URL and just map ports for each app

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3990) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** V2 adds one base origin with host-port, subdomain, or reverse-proxy path generation for onboarding and Docker reconciliation, but it does not provide a persistent list of selectable base addresses or dynamic app URL references.

**Conversation (2 comments read):** All 2 comments were read. The request asks for reusable base addresses such as LAN IPs and domains, selecting one while configuring an app and appending its port, plus easy HTTP/HTTPS switching. A follow-up asks that detected app URLs default to the current Homarr domain/IP and port. V2 covers a substantial workflow slice: URL builders derive service/app addresses from one origin and a detected/default port; onboarding applies them to discovered integrations and apps; and Docker management initializes the origin from request headers and persists one origin and mode in browser local storage. The implementation still stores concrete href/serverUrl values in drafts and app records, and the UI has only one origin field rather than a managed list with per-app selection. Changing an origin therefore does not rewrite existing manually configured apps. The current feature is useful for setup/reconciliation but does not meet the full persistent-address model.

**V2 evidence:**

- packages/definitions/src/integration-url-template.ts:7-65 - hostPort, subdomain, and path modes build service/app URLs from one base host and an optional Docker port. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration-url-template.ts#L7)
- packages/onboarding/src/setup-studio.tsx:171-178,219-238,263-316 - onboarding keeps one serverOrigin/mode state and regenerates discovered app/integration draft URLs with detected published ports. — [source L171](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/onboarding/src/setup-studio.tsx#L171)
- apps/nextjs/src/app/[locale]/manage/tools/docker/page.tsx:21-33 - Docker reconciliation receives the current request's base origin as the default template host. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/docker/page.tsx#L21)
- apps/nextjs/src/app/[locale]/manage/tools/docker/docker-reconciliation.tsx:91-98,161-166 - Docker management persists one origin and one URL mode in localStorage and applies them to candidates. — [source L91](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/docker/docker-reconciliation.tsx#L91)
- packages/validation/src/app.ts:3-20 - app records validate/store a concrete href string; there is no base-address reference or port-only field. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/app.ts#L3)
- reports/v2-issue-triage/source/3990.json:1-203 - both the original request and translated follow-up were read; the follow-up's current-origin behavior is covered only for discovered setup candidates.

**Remaining / follow-up:** Add a server- or user-scoped base-address registry, app-level selection/reference semantics, and a deliberate update/migration policy for existing hrefs. Preserve the current one-origin template as a convenient setup default.

### #3904 — feat: GPU usage in Dash component

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3904) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 supports an optional GPU chart in System Resources, fetches Dashdot GPU data, and leaves GPU unselected by default so installations without GPU telemetry continue to work.

**Conversation (3 comments read):** All 3 comments were read. The requester asks for GPU percentage usage from Dashdot's NVIDIA image after losing the capability during the pre-1.0 transition. A maintainer notes that GPU reporting can vary, while the follow-up agrees to expose it through chart selection and keep it disabled by default. V2 implements that contract: the resource options include gpu alongside CPU, memory, and network; toChartItem averages processorUtilization across the returned GPU devices; and the component renders SystemResourceGPUChart when selected. Dashdot requests /load/gpu and maps memory and processor utilization, while request failures degrade to an empty GPU list. The default visible chart set excludes GPU, matching the discussion, but users can opt in where Dashdot supplies data.

**V2 evidence:**

- packages/widgets/src/system-resources/index.ts:16-38 - visibleCharts includes gpu and defaults to cpu, memory, and network, leaving GPU opt-in. — [source L16](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-resources/index.ts#L16)
- packages/widgets/src/system-resources/component.tsx:40-53,287-295 - GPU processor utilization is averaged into ChartItem.gpu and rendered through SystemResourceGPUChart when visible. — [source L40](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-resources/component.tsx#L40)
- packages/integrations/src/dashdot/dashdot-integration.ts:28-36,61-68 - Dashdot requests GPU data with the other metrics and maps memory/processor utilization fields. — [source L28](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/dashdot/dashdot-integration.ts#L28)
- packages/integrations/src/dashdot/dashdot-integration.ts:164-173 - GPU endpoint failures are caught and converted to an empty result, so unsupported installations do not make the widget fail. — [source L164](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/dashdot/dashdot-integration.ts#L164)
- reports/v2-issue-triage/source/3904.json:1-203 - all three comments were read, including the request to make GPU selectable but unselected by default.

**Remaining / follow-up:** No source-level implementation gap remains. GPU visibility and telemetry still depend on a Dashdot build that exposes /load/gpu; live hardware verification was outside this triage.

### #3887 — feat: allow no network for system resources and allow proxmox to be used

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3887) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** V2 hides the network chart when no network history exists, but Proxmox remains excluded from the System Resources integration selector and only supplies cluster health data.

**Conversation (3 comments read):** All 3 comments were read. The reporter can select Proxmox and Dashdot for System Health Monitoring but only Dashdot for System Resources, despite the documentation suggesting broader support. Maintainers explain that Proxmox does not expose the expected host network data, propose hiding unsupported network output, and leave open the possibility of a future partial network view. V2 implements the safe no-network behavior: the widget filters the network chart when no network samples exist. It does not implement Proxmox as a System Resources provider; the widget integration map's system list contains Dashdot and other system-health integrations, while Proxmox is placed in a separate cluster list. ProxmoxIntegration implements only IClusterHealthMonitoringIntegration, so selecting it for the resource widget remains impossible. The reporter's two requested parts therefore have different dispositions.

**V2 evidence:**

- packages/definitions/src/widget-integration-map.ts:16-33,59-68 - healthMonitoring accepts a separate Proxmox cluster list, while systemResources uses only healthMonitoringSystemIntegrationKinds and excludes Proxmox. — [source L16](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/widget-integration-map.ts#L16)
- packages/integrations/src/proxmox/proxmox-integration.ts:24-50 - ProxmoxIntegration implements IClusterHealthMonitoringIntegration and exposes cluster resources, with no system-health/network interface for System Resources. — [source L24](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/proxmox/proxmox-integration.ts#L24)
- packages/widgets/src/system-resources/component.tsx:67-85,227-235 - configured charts are filtered by available GPU/network data and network is omitted when getNetworkHistory has no samples. — [source L67](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-resources/component.tsx#L67)
- packages/widgets/src/system-resources/index.ts:22-38 - the resource widget offers CPU, memory, GPU, and network chart choices but its integration config comes from the restricted system list. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/system-resources/index.ts#L22)
- reports/v2-issue-triage/source/3887.json:1-203 - all three comments were read; maintainers explicitly separate unsupported Proxmox network data from the requested selector behavior.

**Remaining / follow-up:** Either add a Proxmox-compatible System Resources adapter with clearly defined network semantics or update the widget documentation/selector wording to describe cluster-only Proxmox support. No network-chart handling gap remains for integrations that return no network samples.

### #3731 — Release Widget: Docker importable programs

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3731) · **Bugs** · **Partially addressed** · Confidence: **medium**

**Request:** V2 corrects the screenshot's GHCR provider mapping and retains duplicate filtering, but it still treats imagegenius/immich and an existing immich-app/immich repository as different provider/identifier pairs.

**Conversation (0 comments read):** The issue body and its zero comments were read. The reporter says Immich is offered as importable even though a matching repository is already configured, and that the newly imported entry does not work. The screenshots show an existing GitHub repository immich-app/immich and a Docker candidate imagegenius/immich. V2 maps ghcr.io images to GitHub Container Registry and normalizes the image before comparing it with configured repositories, improving the old provider-path error. However, alreadyImported remains an exact provider plus normalized identifier comparison, so imagegenius/immich is not considered the upstream immich-app/immich repository. That leaves the reported duplicate/identity mismatch only partly addressed; no live fetch or issue-specific regression was run.

**V2 evidence:**

- packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx:698-732 - Docker images are parsed into provider/identifier pairs and compared with configured repositories to set alreadyImported. — [source L698](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx#L698)
- packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx:744-750 - allImagesImported and anyImagesImported derive the modal's duplicate state from that pairwise comparison. — [source L744](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx#L744)
- packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx:806-843 - selectable results exclude alreadyImported entries, while the imported list is rendered checked and disabled. — [source L806](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx#L806)
- packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx:870-875 - ghcr.io now maps to gitHubContainerRegistry, while docker.io and other registries retain their own provider kinds. — [source L870](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/_inputs/widget-multiReleasesRepositories-input.tsx#L870)
- packages/definitions/src/release-provider.ts:53-77 - normalization strips registry prefixes and image tags/digests, but does not map imagegenius/immich to the separate immich-app/immich GitHub repository. — [source L53](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/release-provider.ts#L53)
- reports/v2-issue-triage/source/3731.json:10-58,76 - the full report has four screenshots and no comments; the screenshots identify the existing immich-app/immich and candidate imagegenius/immich values.

**Remaining / follow-up:** Decide whether cross-provider image identity should be canonicalized or whether the import UI should clearly explain that imagegenius/immich is a different source. Add a regression case for the screenshot's GHCR image and existing immich-app/immich entry, then verify the imported source actually serves releases.

### #3597 — bug: nexcloud integration with subpaths do not work

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3597) · **Bugs** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 preserves a configured Nextcloud base path while constructing the DAV calendar endpoint, including trailing slashes and an already supplied DAV path.

**Conversation (0 comments read):** The issue body and its zero comments were read. The reporter shows tsdav resolving https://example.com/nextcloud/.well-known/basic at the host root, so a Nextcloud installation behind a subpath cannot be tested or queried through the integration. The report suggests an upstream fix or proxy workaround and was filed against 1.26.0. V2 contains a focused URL builder wired into the Nextcloud DAV client; the associated release/v2 merge (#6786) adds coverage for root, subpath, trailing-slash, and existing-DAV inputs. The direct implementation addresses the reported path loss without relying on the issue's suggested proxy workaround.

**V2 evidence:**

- packages/integrations/src/nextcloud/nextcloud-url.ts:1-12 - createNextcloudCalendarServerUrl retains the configured pathname, appends /remote.php/dav/, clears query/hash, and avoids duplicating an existing DAV endpoint. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/nextcloud-url.ts#L1)
- packages/integrations/src/nextcloud/nextcloud.integration.ts:191-205 - the DAVClient receives the path-preserving URL helper result as serverUrl for all calendar operations. — [source L191](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/nextcloud.integration.ts#L191)
- packages/integrations/src/nextcloud/test/nextcloud-url.spec.ts:5-28 - focused cases verify root installations, /nextcloud subpaths, trailing slashes, and pre-existing DAV endpoints. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/test/nextcloud-url.spec.ts#L5)
- packages/integrations/src/nextcloud/test/nextcloud-integration.spec.ts:34-38 - the integration test asserts the configured subpath is used by the client. — [source L34](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/nextcloud/test/nextcloud-integration.spec.ts#L34)
- reports/v2-issue-triage/source/linked-prs/6786.json:12,34-39 - linked PR metadata records the release/v2 merge for the focused Nextcloud subpath fix; disposition is based on the inspected source and tests.

**Remaining / follow-up:** Five direct assertions against the unmodified release/v2 URL helper passed (root, subpath, trailing slash, existing DAV endpoint, query/hash cleanup). A live Nextcloud calendar request, authentication and rendering remain untested; see RUNTIME-VALIDATION.md.

### #3512 — feat: Add Support for Homey API Integration

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3512) · **Integration requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has no native Homey integration, Homey widget, or Homey integration kind; its existing Home Assistant support and generic Custom Widgets do not fulfill this native request.

**Conversation (6 comments read):** All 6 comments were read. The requester asks for Homey device/capability status and possibly actions/flows through the bearer-token REST API, and offers to contribute or provide access. Maintainers point to existing Home Assistant support and explain that integrations/widgets rely on entity IDs, while the requester later says Homey's device model is more complex and does not produce a completed PR. The final comment only supplies a sample device payload and asks whether maintainers would develop it. There is no later implementation or maintainer confirmation.

**V2 evidence:**

- packages/definitions/src/integration.ts:58-584 — the complete v2 integration definition registry contains Home Assistant and other supported services but no Homey definition, so Homey cannot be selected/configured as an integration kind. — [source L58](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L58)
- packages/integrations/src/base/creator.ts:9-115 — the exhaustive integration creator map has no Homey factory and is checked with satisfies Record<IntegrationKind, ...>. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/base/creator.ts#L9)
- packages/widgets/src/registry.ts:1-40 — widgets are registered against concrete widget kinds and integration mappings; no Homey widget is registered in the v2 registry. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/registry.ts#L1)
- packages/definitions/src/integration.ts:266-275 — the existing Home Assistant entry demonstrates the separate native smart-home integration the requester was comparing against. — [source L266](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L266)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:111-119 — the release lists supported Assistant service tooling but does not announce Homey support. — [source L111](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L111)

**Remaining / follow-up:** A native Homey integration would need a registered kind, authenticated API client, device/capability and action schemas, widget configuration/rendering, permissions, and documentation. A generic Custom Widget can be a user workaround but is not evidence that this native integration request is addressed.

### #2861 — bug: All apps drop out of their categories on mobile, or if the browser is resized to a smaller width

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2861) · **Bugs** · **Partially addressed** · Confidence: **high**

**Request:** V2 replaces the old category/dynamic-section layout with responsive Base, Mobile, and custom layouts plus reset/projection logic, but item membership is still persisted independently per layout and can diverge across breakpoints.

**Conversation (13 comments read):** All 13 comments were read. The original report says apps and dynamic-section contents disappear or reorder at smaller breakpoints and asks why categorization must be repeated per layout. Maintainers initially described independent layouts as expected and discussed generating other sizes from a Base layout. Multiple users argued that functional categories should survive viewport changes and reported dynamic-section membership reverting. The latest screenshots reproduce the behavior on desktop Firefox; the maintainer says v2's dashboard rewrite likely fixes it as a side effect, but no reporter confirms v2. The later discussion also contains a separate request to constrain icon minimum size.

**V2 evidence:**

- packages/api/src/router/board.ts:1458-1506 — v2 provides resetLayout, projecting a non-Base layout from Base and replacing target item/section layout records. — [source L1458](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1458)
- packages/api/src/router/board.ts:2364-2468 — responsive projection remaps lanes and generates new item layouts, including each item's current sectionId, when creating/resizing a layout. — [source L2364](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L2364)
- apps/nextjs/src/components/board/sections/use-section-items.ts:7-15,30-54 — rendering selects the current layout and indexes each item by that layout's sectionId, so membership is layout-specific at runtime. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/use-section-items.ts#L7)
- apps/nextjs/src/components/board/sections/grid/use-grid-layout-actions.ts:29-65 — drag/drop commits sectionId only on the layout being edited, leaving other breakpoint memberships untouched. — [source L29](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/grid/use-grid-layout-actions.ts#L29)
- packages/boards/src/context.tsx:83-87,138-147 — viewport resize selects a different layout ID, which drives the layout-specific section index. — [source L83](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/boards/src/context.tsx#L83)

**Remaining / follow-up:** Test a migrated v1 board with categories/dynamic sections across every configured breakpoint, including edits followed by resize and refresh. If the requirement is invariant functional membership, v2 needs shared section membership or automatic synchronized updates; Base reset/projection alone does not guarantee it.

### #2657 — feat(auth): support object path for groups and username claims

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2657) · **Quality of life** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 resolves dot-separated OIDC claim paths for both external group synchronization and the configurable username claim.

**Conversation (4 comments read):** All 4 comments were read. The original Keycloak report used resource_access.homarr.roles and failed because only a first-level profile key was checked. The maintainer described the recursive-path fix, and the reporter then confirmed a flat-array workaround and invited closure; the issue was renamed to a low-priority feature request. Timeline later cross-references PR #6294, which is still open against dev, but the release/v2 source already contains the path resolver and uses it in both affected flows. Current SSO documentation also advertises dot-separated paths.

**V2 evidence:**

- packages/auth/providers/oidc/profile.ts:5-12 — getProfileValueByPath walks each dot-separated segment through nested profile objects and returns undefined for missing/non-object segments. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/oidc/profile.ts#L5)
- packages/auth/events.ts:33-38 — OIDC group synchronization reads AUTH_OIDC_GROUPS_ATTRIBUTE through getProfileValueByPath and accepts the nested array. — [source L33](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/events.ts#L33)
- packages/auth/providers/oidc/profile.ts:15-22 — AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE is resolved through the same helper and type-checked as a string. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/oidc/profile.ts#L15)
- apps/docs/docs/advanced/single-sign-on/index.mdx:205-207 — the v2 SSO reference documents nested paths for both groups and name attributes. — [source L205](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/single-sign-on/index.mdx#L205)
- packages/auth/test/events.spec.ts:161-171, packages/auth/providers/oidc/test/profile.spec.ts:30-38 — focused fixtures cover nested group and profile claim paths. — [source L161](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/test/events.spec.ts#L161), [source L30](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/providers/oidc/test/profile.spec.ts#L30)

**Remaining / follow-up:** No issue-level implementation gap remains for the reported nested Keycloak claim. The linked PR #6294's open/dev status should not override the directly inspected release/v2 implementation; deployment-specific verification is optional.

### #2482 — feat: add all relevant tRPC queries / mutations as openapi endpoint

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2482) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 exposes a meaningful OpenAPI subset for apps, boards, users, invites, settings, and info, while many routers and relevant procedures remain outside the generated OpenAPI router.

**Conversation (1 comments read):** The issue's single comment was read. The request is for all relevant tRPC queries and mutations to be usable programmatically with an API key. Timeline events mark it duplicate and link the older API request #1978, but neither the duplicate marker nor that relationship establishes complete endpoint coverage. V2 has explicit OpenAPI metadata on several management procedures and a generated document, yet the canonical app router includes integrations, sections, widgets, Docker, groups, API keys, media, onboarding, and other routers that are not included in the OpenAPI router. Some procedures within included routers also lack metadata.

**V2 evidence:**

- packages/api/src/open-api.ts:13-20 — the generated OpenAPI router includes only app, board, info, invite, serverSettings, and user routers. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/open-api.ts#L13)
- packages/api/src/root.ts:5-33 — the full tRPC app router also registers integration, group, section, widget, Docker, Kubernetes, media, onboarding, API-key, custom-widget, and other routers absent from openApiRouter. — [source L5](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/root.ts#L5)
- packages/api/src/router/app.ts:21-38,55-67 — included app procedures explicitly carry OpenAPI metadata, showing the implemented subset is intentional and procedure-level. — [source L21](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/app.ts#L21)
- packages/api/src/router/integration/integration-router.ts:52-80,92-104,143-162 — configured-integration procedures are present in tRPC but have no OpenAPI metadata and cannot appear in the generated document. — [source L52](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/integration/integration-router.ts#L52)
- apps/nextjs/src/app/api/[...trpc]/route.ts:15-39 — the OpenAPI handler supports API-key-derived context, so authentication plumbing exists for whatever endpoints are registered. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/[...trpc]/route.ts#L15)

**Remaining / follow-up:** Define the supported API surface and add metadata/output schemas for the relevant missing routers and procedures, with deliberate exclusions for sensitive or UI-only operations. The existing OpenAPI subset and API-key handler do not satisfy the stated all-relevant coverage.

### #2095 — feat: add css templates

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2095) · **Quality of life** · **Partially addressed** · Confidence: **high**

**Request:** V2 adds a moderated Workshop catalog for sharing and importing Custom CSS, but it does not implement the requested composable, parameterized CSS-template system.

**Conversation (6 comments read):** All 6 comments were read. The requester wants centrally hosted CSS fragments that can be selected in advanced item/category/dynamic-section settings or board CSS, with typed variables such as border radius. Follow-ups add colors, font size, icon size, hidden bookmark URLs, and a public repository anyone can contribute to; the requester explicitly distinguishes composable fragments from whole themes. V2's release discussion and source show community Custom CSS sharing, which covers centralized discovery and reuse of complete CSS text. The import path still replaces the current editor value, and the conversation's variable and target-scope requirements remain separate.

**V2 evidence:**

- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:55-57 — the v2 release documents Workshop sharing for Custom CSS and its import workflow. — [source L55](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L55)
- apps/nextjs/src/components/workshop/workshop-css-import-button.tsx:69-90 — the picker requests a customCss submission, validates it as one string, and passes that string to the editor; there is no template-variable or target-scope model. — [source L69](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/workshop/workshop-css-import-button.tsx#L69)
- packages/workshop/src/schema.ts:7-12,229-247 — Custom CSS is a single schema version with length validation and no structured variables, selectors, or fragment composition. — [source L7](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/workshop/src/schema.ts#L7)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_customCss.tsx:26-37 — board settings expose one Custom CSS editor plus Workshop import, while no per-item/category/template selector is present. — [source L26](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_customCss.tsx#L26)
- apps/nextjs/src/components/board/sections/container/container-edit-modal.tsx:33-69 — Container styling is limited to manually entered CSS classes and a border color field. — [source L33](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/sections/container/container-edit-modal.tsx#L33)
- apps/docs/docs/advanced/styling/index.mdx:3-12 — current guidance describes global/board raw CSS and its risks rather than a reusable template contract. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/styling/index.mdx#L3)

**Remaining / follow-up:** Add a structured template format with typed variables, explicit selector/target scopes, composition semantics, and selectors for item and container settings. Workshop's raw CSS import is useful partial coverage but cannot prove the requested fragment system.

