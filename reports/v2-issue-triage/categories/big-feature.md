# Large feature requests

14 issues. See [complete report](../REPORT.md) and [methodology](../README.md).

### #6543 — Upgrade to MCP v2 (spec 2026-07-28)

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6543) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** The SDK and stateless MCP transport upgrade are present, including tool-list cache hints and compatibility tests. The issue also proposes OAuth metadata/CIMD work and documentation/Assistant validation; those are not all demonstrated by the transport implementation.

**Conversation (0 comments read):** The issue has no comments. Its proposed scope includes the SDK/stateless handler migration, method/name headers and cache hints, evaluating CIMD/pre-registered clients and metadata, updating protocol documentation, and verifying Assistant compatibility. V2 implements the transport and SDK portion; this does not establish completion of the whole checklist.

**V2 evidence:**

- pnpm-lock.yaml:6354-6360 + 21087-21094 + @modelcontextprotocol/core and @modelcontextprotocol/server are pinned at 2.0.0 in the v2 dependency graph. — [source L6354](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/pnpm-lock.yaml#L6354)
- apps/nextjs/src/app/api/mcp/_protocol.ts:30-41 + the MCP server advertises tool cache hints with a five-minute private TTL. — [source L30](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_protocol.ts#L30)
- apps/nextjs/src/app/api/mcp/_protocol.ts:43-50 + 78-81 + the protocol exposes tools and creates a handler with legacy stateless mode. — [source L43](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_protocol.ts#L43)
- apps/nextjs/src/app/api/mcp/_handler.ts:256-263 + 277-285 + 298-343 + the endpoint removes legacy SSE assumptions, handles OAuth challenges, and processes requests without a protocol session. — [source L256](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_handler.ts#L256)
- apps/nextjs/src/app/api/mcp/_protocol.spec.ts:16-20 + 78-105 + tests target 2026-07-28 metadata, stateless behavior, cache hints, and no protocol session. — [source L16](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/mcp/_protocol.spec.ts#L16)
- packages/api/src/test/mcp.spec.ts:437-460 + integration tests send MCP method/name headers and assert no Mcp-Session-Id. — [source L437](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/test/mcp.spec.ts#L437)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:107-109 + v2 documents the /api/mcp endpoint with API-key/OAuth access. — [source L107](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L107)
- apps/nextjs/src/app/well-known/[...path]/route.ts:15-35 + authorization-server metadata still advertises DCR registration; it does not advertise client_id_metadata_document_supported or authorization_response_iss_parameter_supported. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/well-known/[...path]/route.ts#L15)
- apps/docs/docs/management/mcp.mdx:13-14 + documentation now names protocol 2026-07-28 and stateless requests; this is stronger than citing the general V2 release blog, but does not document the cache hints. — [source L13](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/management/mcp.mdx#L13)

**Remaining / follow-up:** Record the OAuth/CIMD evaluation and any consciously deferred scope, align authorization-server metadata and cache documentation, and verify the built-in Assistant and external-client compatibility before treating the full proposal as complete. DCR retention alone is not a claim of protocol noncompliance.

### #6435 — feat: Expand Homarr API Coverage to Support Full Dashboard Automation

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6435) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 exposes useful board CRUD/settings and board-item creation plus a broad MCP tool surface, but it does not provide the full declarative REST/OpenAPI coverage required for Terraform-style dashboard automation.

**Conversation (3 comments read):** The issue requests complete automation: board/section/layout/item CRUD and geometry, integrations, search engines, users/API keys, import/export, and bootstrap-safe authentication. Follow-up discussion specifically notes that board settings are write-only, tiles are create-only, and groups/integrations are missing. The linked REST expansion PR #6546 is still unmerged, so it cannot be credited. MCP #5882 is merged, but the issue's REST/IaC contract remains broader than MCP availability.

**V2 evidence:**

- packages/api/src/router/board.ts:326-372 + board listing is available, while the returned overview is a summary rather than a complete declarative resource graph. — [source L326](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L326)
- packages/api/src/router/board.ts:1526 + settings PATCH exists, but no corresponding board settings GET appears in the router for round-trip automation. — [source L1526](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1526)
- packages/api/src/router/board.ts:2147-2151 + the current board-item REST surface includes creation; no item GET/PATCH/DELETE/list/move/resize procedure is present in this router search. — [source L2147](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L2147)
- packages/api/src/router/integration/integration-router.ts:70-80 + 223-233 + integration list/create procedures carry MCP metadata but do not establish the requested OpenAPI/IaC surface. — [source L70](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/integration/integration-router.ts#L70)
- reports/v2-issue-triage/source/linked-prs/6546.json:triage_merge_commit_is_ancestor_of_v2 + false; the proposed REST expansion is unmerged and cannot count as v2 implementation evidence.
- reports/v2-issue-triage/source/linked-prs/5882.json:triage_merge_commit_is_ancestor_of_v2 + true; merged MCP tools improve automation but do not replace the issue's requested REST resource CRUD.

**Remaining / follow-up:** Add round-trip REST/OpenAPI endpoints for settings, sections, layouts, and every item geometry/update/delete operation, then cover integrations, groups/containers, search engines, users/API keys, import/export, and bootstrap/auth semantics. Publish the schemas and permission behavior for Terraform/Ansible clients.

### #6403 — feat: Dynamic apps fetched from reverse proxy

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/6403) · **Large feature requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has no Caddy integration or dynamic reverse-proxy-to-app-tile pipeline. The native reverse-proxy support is Traefik, whose widget aggregates router/service/middleware health and counts from configured integrations; it does not create or update board app items. No package exposes a reverse-proxy discovery result as dashboard apps, and no Caddy client is registered.

**Conversation (6 comments read):** The issue asks Homarr to fetch services and exposed/internal hosts from a Caddy API, then dynamically create or filter app entries, with custom JavaScript as a possible extension. The discussion considers middleware and mobile/category layout concerns; the reporter later drops implementation interest because of those separate layout problems, but the feature request remains. No linked PR or comment claims that a dynamic app source shipped.

**V2 evidence:**

- packages/definitions/src/integration.ts:524-530 — the reverse-proxy definition present in V2 is Traefik; there is no Caddy definition. — [source L524](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/integration.ts#L524)
- packages/integrations/src/index.ts:46-49 — native exports include Traefik but no Caddy client. — [source L46](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/integrations/src/index.ts#L46)
- packages/widgets/src/traefik/component.tsx:61-78,110-146,218-230 — the Traefik widget combines health/resource summaries and failed endpoints, with no app creation or board mutation. — [source L61](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/traefik/component.tsx#L61)
- packages/widgets/src/registry.ts:64-100 — the explicit widget loader registry has no reverse-proxy discovery or dynamic-app module. — [source L64](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/registry.ts#L64)

**Remaining / follow-up:** Add a Caddy/reverse-proxy discovery contract, map stable hosts and metadata to explicit board app items or a safe managed collection, and define refresh, filtering, credentials, and mobile/layout behavior.

### #5867 — feat: REST Endpoint  to manage boards

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5867) · **Large feature requests** · **Will be fixed with V2** · Confidence: **high**

**Request:** The requested board-management REST surface exists in the current release/v2 API: board listing/creation/duplication/rename/visibility/deletion, home-board operations, settings update, and board-item creation are exposed.

**Conversation (2 comments read):** The request asks for an HTTP/REST endpoint so Ansible can create a board and add an app during provisioning. A comment says the endpoint was added in v1.65 and asks for documentation verification. The broader full-dashboard automation gaps are tracked separately in #6435; this assessment covers the narrower original board-management request.

**V2 evidence:**

- packages/api/src/router/board.ts:326-372 + GET board management overview/list data is available through the API. — [source L326](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L326)
- packages/api/src/router/board.ts:651 + 721 + 1018 + 1036 + 1066 + board creation, duplication, rename, visibility, and deletion procedures are present. — [source L651](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L651)
- packages/api/src/router/board.ts:1082-1098 + home and mobile-home board operations are exposed. — [source L1082](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1082)
- packages/api/src/router/board.ts:1526 + board settings can be updated through the API. — [source L1526](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1526)
- packages/api/src/router/board.ts:2147-2151 + board items/apps can be created through the API. — [source L2147](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L2147)
- apps/docs/docs/management/api/index.mdx:62-71 + current API documentation states that boards can be created/configured and content managed, including home boards. — [source L62](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/management/api/index.mdx#L62)

**Remaining / follow-up:** The issue's minimal create-board/add-app workflow is covered. Declarative read/update/delete coverage for every board item and related resources remains the separate #6435/#6546 scope.

### #5769 — feat: Support Kubernetes integration as dashboard widgets instead of a global tool for multi-tenant access control

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5769) · **Large feature requests** · **Not addressed** · Confidence: **high**

**Request:** Kubernetes remains a global, admin-only management tool in V2. The route requires both admin permission and ENABLE_KUBERNETES, uses a shared context selector, and renders cluster/resource pages under /manage/tools/kubernetes. The cluster dashboard queries cluster-wide data for the selected context; there is no Kubernetes integration kind or widget package that can be placed on a board with per-widget cluster/resource scoping.

**Conversation (0 comments read):** The issue requests dashboard widgets for multiple Kubernetes clusters, with granular metric/resource selection and tenant boundaries instead of a global tool. It has no comments proposing a reduced scope or reporting a fix. V2's current Kubernetes pages improve the global tool's context selection but do not change its access boundary or expose it through the board widget model. Generic Custom Widgets do not provide native Kubernetes authentication or the requested safe multi-tenant policy.

**V2 evidence:**

- apps/nextjs/src/app/[locale]/manage/tools/kubernetes/page.tsx:9-19 — the Kubernetes route is gated by admin permission and ENABLE_KUBERNETES and renders the management dashboard. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/kubernetes/page.tsx#L9)
- apps/nextjs/src/app/[locale]/manage/tools/kubernetes/layout.tsx:1-15 — context selection is placed in the global management layout around child pages. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/kubernetes/layout.tsx#L1)
- apps/nextjs/src/app/[locale]/manage/tools/kubernetes/cluster-dashboard/cluster-dashboard.tsx:17-34,36-87 — the dashboard queries the selected global context and renders cluster, capacity, and resource tiles, rather than a board widget contract. — [source L17](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/kubernetes/cluster-dashboard/cluster-dashboard.tsx#L17)
- packages/definitions/src/kubernetes.ts:1-21,86-107 — Kubernetes data types exist, but no integration definition or board-widget type is declared. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/kubernetes.ts#L1)

**Remaining / follow-up:** Expose Kubernetes as a first-class, permission-scoped integration/widget model with per-cluster credentials and resource selectors, while preserving tenant isolation and avoiding global-admin data leakage.

### #5154 — feat: SLO (Single Log-out)

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/5154) · **Large feature requests** · **Not addressed** · Confidence: **high**

**Request:** V2 supports local sign-out followed by an optional redirect, but it does not implement Authentik/OIDC single logout, a front-channel logout endpoint, or a back-channel session-revocation endpoint.

**Conversation (6 comments read):** The request asks Homarr to participate in SLO so an Authentik logout can clear Homarr sessions, including when users are deleted remotely. Six comments discuss front-channel and back-channel options, the endpoint/auth/user-identifier requirements, and maintainer reluctance because the affected group is small; a volunteer asks for implementation direction but cannot implement it. No timeline event shows a merged SLO feature.

**V2 evidence:**

- reports/v2-issue-triage/source/5154.json:1 — the complete body and all six full comments were read, including front-channel/back-channel alternatives and maintainer/volunteer discussion.
- apps/nextjs/src/app/api/auth/[...nextauth]/route.ts:9-17 — the auth route exposes only Auth.js GET and POST handlers; there is no dedicated front-channel logout route. — [source L9](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/api/auth/[...nextauth]/route.ts#L9)
- apps/nextjs/src/components/user-avatar-menu.tsx:59-65 — sign-out deletes the local Auth.js session, then redirects to AUTH_LOGOUT_REDIRECT_URL if configured; it does not coordinate session logout with the provider. — [source L59](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/user-avatar-menu.tsx#L59)
- packages/auth/env.ts:26-29 — the only logout-related environment variable is an optional redirect URL. — [source L26](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/auth/env.ts#L26)
- apps/docs/docs/advanced/single-sign-on/index.mdx:20-27,270-284 — SSO docs describe a post-logout redirect example for Authentik, not provider-initiated session revocation or back-channel logout. — [source L20](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/single-sign-on/index.mdx#L20)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:156-167 — v2's permissions and Assistant/MCP compatibility notes do not add SLO. — [source L156](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L156)

**Remaining / follow-up:** Choose a provider protocol and session model, then implement and secure front-channel and/or back-channel logout with issuer validation, logout-token handling, and local session revocation. Document provider prerequisites and failure behavior.

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

### #4541 — feat(boards): support automatic layout for different screen sizes

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/4541) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 implements responsive board layouts with protected Mobile and Base roles, breakpoint selection, custom layouts, previews, and reset-from-Base behavior. The runtime selects a layout for the viewport, settings can add custom breakpoint layouts seeded from Base geometry, and the API projects Base content into new or reset layouts. Existing non-Base layouts are not automatically reprojected whenever Base geometry is edited, so the broader automatic recalculation request is only partially covered.

**Conversation (9 comments read):** The issue proposes deriving layouts for different screen sizes from a base layout while allowing custom overrides, with DB role/layout-mode ideas and an edit strategy. Comments discuss generating five to seven layouts, choosing a base layout, auto-sizing, and using mobile as a secondary layout; the final discussion favors a default/base layout plus an algorithm and explicit editing. V2 ships the Base/Mobile/breakpoint/reset architecture, but save propagation must be checked against the requested all-nonbase recalculation: the API projects new layouts and explicit resets, while existing layouts are processed independently.

**V2 evidence:**

- packages/boards/src/layout-selection.ts:1-20 — runtime layout selection sorts breakpoints and chooses the layout for the current viewport width. — [source L1](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/boards/src/layout-selection.ts#L1)
- packages/definitions/src/board.ts:4-16,27-60 — layout roles include mobile/base/custom and are normalized with protected role semantics. — [source L4](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/board.ts#L4)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_layout.tsx:104-145,184-205 — settings add custom breakpoint layouts using Base geometry, expose breakpoints, and show a source layout preview. — [source L104](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_layout.tsx#L104)
- packages/api/src/router/board.ts:1223-1288,1291-1324,1458-1495 — new layouts and explicit resets project from Base, but an existing layout update uses its own prior geometry and only layouts independently detected as changed are processed. — [source L1223](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/board.ts#L1223)

**Remaining / follow-up:** Decide whether editing Base should automatically regenerate every non-Base layout or only offer reset; if automatic, propagate the new Base elements/geometry to existing layouts while preserving intentional overrides, then verify save and migration behavior.

### #3913 — feat: Support running as fully non-root containers

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3913) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 supports dropping privileges to a configured PUID/PGID after startup, including ownership preparation for app data, the Next cache, and nginx directories. It still defaults to root, performs mkdir/chown work in the entrypoint, and uses su-exec only when PUID is nonzero. A runtime/container user supplied directly through Docker or Podman therefore does not get a fully non-root startup path, matching the issue's cache and chown failures.

**Conversation (2 comments read):** The report supplies a rootless Podman proof of concept, explains that the entrypoint's root chown cannot run under user 1234:1234, and calls out EACCES for the Next cache. Comments discuss making the cache writable or configuring Next and using a Docker group for socket access. Current docs document PUID/PGID as the supported route and explicitly say the default is root. No comment indicates the stronger direct non-root container contract was completed.

**V2 evidence:**

- Dockerfile:52-70,91-100 — the runner image has an entrypoint but no USER directive; runtime directories are prepared during image build and the default command remains root-dependent. — [source L52](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/Dockerfile#L52)
- scripts/entrypoint.sh:4-35,51-54 — PUID/PGID default to 0, ownership changes require startup privileges, and su-exec is used only after that work when PUID is nonzero. — [source L4](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/scripts/entrypoint.sh#L4)
- apps/docs/docs/advanced/running-as-different-user/index.mdx:11-17,20-48 — supported documentation describes root as the default and PUID/PGID as the mechanism for changing runtime ownership. — [source L11](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/advanced/running-as-different-user/index.mdx#L11)
- reports/v2-issue-triage/source/3913.json:90 — the reported direct user mode fails at chown/cache permissions, which the current entrypoint contract still requires.

**Remaining / follow-up:** Support a genuinely non-root image/entrypoint path that never requires chown or privileged filesystem setup, define writable cache/runtime directories and Docker socket behavior, and verify Docker/Podman/Kubernetes user configurations.

### #3784 — feat(app-widget): container linking & run toggling

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3784) · **Large feature requests** · **Not addressed** · Confidence: **high**

**Request:** V2 has Docker container actions and a modal that can create an app from a selected container, but it does not persist an app-to-container link or expose container status/start/stop controls on the native app tile.

**Conversation (0 comments read):** The body asks for a container-linking option in the app widget alongside Simple Ping and New Tab, with run toggling/status shown from the paired Docker container. It has no comments. The timeline marks a duplicate/follow-up relationship to #4085 but provides no merged implementation. Current Docker actions remain confined to the Docker widget and add-app flow.

**V2 evidence:**

- reports/v2-issue-triage/source/3784.json:1 — the complete feature request was read; full_comments is empty.
- packages/widgets/src/docker/component.tsx:242-305 — the Docker widget queries endpoint-scoped containers and handles start, stop, restart, and remove actions there. — [source L242](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/docker/component.tsx#L242)
- apps/nextjs/src/components/board/items/item-menu.tsx:59-96 — native app edit values contain app options, integrations, and advanced options, with no Docker endpoint/container identifier. — [source L59](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/components/board/items/item-menu.tsx#L59)
- packages/modals-collection/src/docker/add-docker-app-to-homarr.tsx:22-65 — the Docker import modal derives a URL and creates an app, but its schema stores only container URLs and has no persistent link or run-toggle setting. — [source L22](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/modals-collection/src/docker/add-docker-app-to-homarr.tsx#L22)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:41-69 — Custom Widgets/Workshop are extensibility mechanisms and do not constitute this native app-widget pairing. — [source L41](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L41)

**Remaining / follow-up:** Define a durable endpoint/container reference and permission model, handle deleted or renamed containers, and add native status and lifecycle controls to the app widget. A custom widget or a separate Docker widget action does not satisfy this request.

### #3287 — feat: sidebars

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3287) · **Large feature requests** · **Will be fixed with V2** · Confidence: **high**

**Request:** V2 restores configurable left and right sidebar gutters, including width/column controls and preview/onboarding support, addressing the missing sidebars that blocked the reported upgrade path.

**Conversation (10 comments read):** The requester and several later users said sidebars were the main reason they stayed on v1. Maintainers initially said the feature would return without prioritizing it. In August 2026 the maintainer announced sidebars in the v2 demo, enabled through board settings and configurable from one to three columns; the requester replied that the result exceeded expectations.

**V2 evidence:**

- packages/validation/src/board.ts:80-100 + layout validation includes leftGutterColumnCount and rightGutterColumnCount, bounded to three columns and disabled for mobile layouts. — [source L80](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/validation/src/board.ts#L80)
- apps/nextjs/src/app/[locale]/boards/[name]/settings/_layout.tsx:142-220 + 304-386 + board settings read and edit the gutter layout values and expose sidebar controls. — [source L142](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/boards/[name]/settings/_layout.tsx#L142)
- packages/onboarding/src/setup-studio.tsx:180-190 + 410-423 + 1495-1587 + 1818-1842 + onboarding stores gutter choices, renders them in the preview, and includes them in review/submit. — [source L180](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/onboarding/src/setup-studio.tsx#L180)
- packages/api/src/router/onboard/onboard-router.ts:568-614 + 616-633 + 659-664 + onboarding persists requested gutters and configured layout roots. — [source L568](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/onboard/onboard-router.ts#L568)
- packages/translation/src/lang/en.json:5696-5714 + localized labels explicitly describe left/right sidebar settings. — [source L5696](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/translation/src/lang/en.json#L5696)

**Remaining / follow-up:** Users should still test migrated v1 layouts and responsive widths in their own deployment, but the requested sidebar capability is present in v2.

### #3266 — feat: Multiple Docker Environments in GUI

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/3266) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 supports multiple named Docker/Podman endpoints, endpoint selection in the Docker widget, and management-page inventory across endpoints. The requested GUI endpoint creation/editing experience is still absent; endpoint configuration remains environment-driven.

**Conversation (7 comments read):** The reporter asks for several Docker instances in the management GUI, like Portainer, and for hostname overrides during imports. The seven comments explain that environment variables already supported multiple hosts, but the reporter found the setup confusing and wanted a GUI to add hosts, see columns, and configure socket and proxy endpoints together. A maintainer agreed a GUI was future work and pointed to #2477; the timeline later marked the issue duplicate without adding endpoint editing.

**V2 evidence:**

- reports/v2-issue-triage/source/3266.json:1 — the complete body and all seven full comments were read, including the environment-variable confusion and GUI request.
- apps/docs/docs/integrations/docker/index.mdx:18,55-63 — Docker endpoints are explicitly configured with environment variables, including multiple host/port pairs. — [source L18](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/integrations/docker/index.mdx#L18)
- apps/docs/docs/integrations/docker/index.mdx:71-108 — v2 documents named DOCKER_ENDPOINTS descriptors with socket, TCP, TLS, and per-endpoint capabilities. — [source L71](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/integrations/docker/index.mdx#L71)
- packages/docker/src/endpoint-descriptor.ts:3-25,30-57,60-103 — v2 parses and validates multiple uniquely identified endpoint descriptors and their transports. — [source L3](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/endpoint-descriptor.ts#L3)
- packages/docker/src/singleton.ts:52-99,102-128 — the Docker singleton initializes all configured endpoints, preserves endpoint IDs, and tolerates initialization failures per endpoint. — [source L52](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/docker/src/singleton.ts#L52)
- packages/widgets/src/docker/index.ts:27-79 — the Docker widget exposes endpoint IDs as a selectable option and uses them to query inventory. — [source L27](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/widgets/src/docker/index.ts#L27)
- apps/nextjs/src/app/[locale]/manage/tools/docker/page.tsx:15-34 — the management page consumes discovered containers/endpoints; it has no endpoint CRUD form. — [source L15](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/nextjs/src/app/[locale]/manage/tools/docker/page.tsx#L15)
- apps/docs/docs/integrations/docker/index.mdx:110-117 — the documented v2 behavior covers multi-endpoint management and widget selection but keeps discovery/configuration outside the GUI. — [source L110](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/integrations/docker/index.mdx#L110)

**Remaining / follow-up:** Build a management UI to add, edit, validate, test, and remove named Docker endpoints, with secure secret/certificate handling and a clear persistence model. The existing environment configuration is a backend capability and does not complete the GUI request.

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

### #2078 — feat: Permission per App / App-Element / Dynamic Group

[Issue and conversation](https://github.com/homarr-labs/homarr/issues/2078) · **Large feature requests** · **Partially addressed** · Confidence: **high**

**Request:** V2 has global app, integration, and board permission levels plus per-board and per-integration access, but it does not implement per-app, per-item, or per-dynamic-group visibility. The current app access guard explicitly allows any logged-in user to see apps, so the requested OIDC-group-driven hiding is not addressed.

**Conversation (13 comments read):** The original request asks to hide or show apps, app elements, and dynamic groups based on OIDC groups, preferably removing hidden items and reclaiming their space. Across all 13 comments, the author first preferred complete hiding, accepted graying as a fallback, and discussed family users, Dashy-like role visibility, category/widget movement, and separate app or integration lists. Maintainers explained that automatic space filling was difficult, suggested separate boards, said the feature was not a security boundary, and later considered simpler group permissions. The latest comment asks for an update; no implementation or merged fix appears in the assigned timeline.

**V2 evidence:**

- reports/v2-issue-triage/source/2078.json:1 — the complete issue body and all 13 full comments were read; the conversation covers hidden versus disabled behavior, layout space, OIDC groups, and app/integration list visibility.
- packages/definitions/src/permissions.ts:38-71 — v2 defines global group permissions for app, integration, and board capabilities, with inheritance, but no permission key for visibility of an individual app or item. — [source L38](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/definitions/src/permissions.ts#L38)
- apps/docs/docs/management/users/index.mdx:37-71 — documentation describes global app/integration levels and resource-specific board/integration access; it does not describe per-app or per-item group visibility. — [source L37](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/docs/management/users/index.mdx#L37)
- packages/api/src/router/app/app-access-control.ts:20-25 — the current guard says any logged-in user can see all apps, demonstrating that app use/access permissions are not item-level visibility filtering. — [source L20](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/packages/api/src/router/app/app-access-control.ts#L20)
- apps/docs/blog/2026/09-03-homarr-2.0/index.mdx:156-167 — v2 preserves ordinary board permissions and says Assistant/MCP do not bypass them, but does not claim the requested per-element visibility. — [source L156](https://github.com/homarr-labs/homarr/blob/60b4e980ed86a3b36d66bd1e25ee277e13836916/apps/docs/blog/2026/09-03-homarr-2.0/index.mdx#L156)

**Remaining / follow-up:** Implement and define the native semantics for group-based visibility of apps, bookmarks, widgets, and nested containers, including layout reflow and whether hidden items are removed or merely disabled. Treat it as presentation/access control with explicit security boundaries; Custom Widgets or a user-created workaround do not satisfy native app and item filtering.

