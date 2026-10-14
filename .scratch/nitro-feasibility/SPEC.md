## Problem Statement

Homarr needs evidence that a fresh, smaller hosting and application stack can deliver a useful mutable dashboard, rather than merely serve an empty client-rendered shell. Existing research establishes plausible APIs but does not prove their integration, coherent cached rendering, authorized access, restart persistence, or container footprint.

This disposable experiment must answer that question alongside current Homarr without exposing real data or importing the current application's Next.js, tRPC, or Redis dependency graph. It is not a production replacement or a compatibility migration.

## Solution

Build an isolated fixture application using Nitro v3, direct oRPC, Vite, React, manual TanStack Router SSR, and Bun. Serve public and private runtime board records from disposable SQLite through Nitro's database layer. Deliver populated cached HTML with its exact bootstrap snapshot, hydrate it, refresh one controlled HTTP-source widget, and save board edits without rebuilding application code.

Two synthetic identities exercise owner, viewer, and denied access. A small curated REST/OpenAPI surface demonstrates the same real access boundary as the typed API. One container runs the experiment; restarting it preserves committed fixture edits while process-local caches and sessions cold-start. Composed slices can be demonstrated through coordinated focused probes; complete-slice validation and exploratory footprint measurements belong to final integration.

## User Stories

1. As an experiment reviewer, I want to run the new application beside current Homarr, so that the experiment cannot disrupt my existing installation.
2. As an operator, I want an explicitly disposable database and synthetic source data, so that no real boards, credentials, or integrations enter the experiment.
3. As an anonymous visitor, I want to open a public board directly, so that useful board content is available without fixture login.
4. As an anonymous visitor, I want private-board requests denied, so that private content is not disclosed through HTML, bootstrap, or API responses.
5. As a fixture user, I want to select either of two synthetic identities, so that I can exercise different access outcomes without production authentication.
6. As a fixture owner, I want to read my private board after login, so that authenticated rendering and API access can be demonstrated together.
7. As a fixture viewer, I want to read the public board but be denied the other identity's private board, so that a session is not mistaken for blanket authorization.
8. As a fixture user, I want logout and session expiry to remove access on subsequent requests, so that warm server caches cannot bypass session state.
9. As a visitor, I want actual board labels, layout, and widget values in the initial HTML, so that an empty shell cannot be presented as successful SSR.
10. As a returning visitor, I want an authorized repeat request to reuse a populated render artifact, so that the experiment demonstrates caching rather than only rendering speed.
11. As a visitor, I want hydration to begin with exactly the state represented by the HTML, so that cached content does not produce mismatches or silently change on mount.
12. As a visitor, I want direct links, reloads, and browser navigation to work, so that manual SSR remains useful beyond the first page load.
13. As a dashboard user, I want the included widget to refresh from a controlled HTTP source after hydration, so that cached first paint can coexist with useful live data.
14. As a dashboard user, I want observation time and stale/error state to be visible, so that old widget data is not represented as freshly fetched data.
15. As a dashboard user, I want source errors and timeouts handled without losing the board, so that a failed integration does not become an unhandled page failure.
16. As a fixture owner, I want to edit a board label, a small layout setting, and the included widget's display setting, so that the proof includes meaningful runtime editing.
17. As a fixture viewer, I want unauthorized saves rejected by the server, so that hiding editor controls is not the only write protection.
18. As a fixture owner, I want a successful save reflected in the browser and subsequent HTML, so that browser caches and server render artifacts agree on the committed revision.
19. As a fixture owner, I want stale-revision saves rejected visibly, so that concurrent fixture edits do not silently overwrite each other.
20. As an operator, I want committed edits to survive restarting the application with the same disposable database, so that runtime edits are not merely process memory.
21. As a typed-API consumer, I want validated request and response contracts with inferred client types, so that the new API can be consumed without a tRPC bridge or generated client.
22. As a REST consumer, I want one documented board-read sample with matching mounted paths and access behavior, so that generated OpenAPI describes an executable surface.
23. As an operator, I want bounded caches, sessions, and upstream work with explicit shutdown ownership, so that the small demo does not hide unbounded retention.
24. As an experiment reviewer, I want reproducible correctness and footprint observations with omissions recorded, so that a small fixture slice is not misrepresented as a whole-Homarr performance improvement.

## Implementation Decisions

### Approved choices

- Nitro v3 is the sole server host and owns one HTTP listener and its lifecycle. Use direct oRPC `2.0.0-beta.43`; exclude Hono, Elysia, and Eden from this experiment.
- Use Vite, React, and TanStack Router with actual manual SSR. TanStack Start and the named client-rendered Nitro Router example are not substitutes for this integration.
- Bun is the first runtime target. Use SQLite through Nitro's database layer with an explicit fixture database location and a compatible Bun SQLite connector. The abstraction does not remove the SQLite engine or establish production database portability.
- Create a new experimental application beside current Homarr. Its deployed server and browser dependency graphs must exclude Next.js, tRPC, Redis, and the Homarr packages that bring those dependencies in. Existing Homarr code, runtime, and real data remain untouched.
- Use two synthetic identities, public/private boards, fixture-only sessions, bounded in-process caches, one controlled HTTP-source polling widget, board editing, typed API access, a curated REST/OpenAPI sample, restart-persistent fixture edits, and one container.
- Package upgrades are allowed. Align the oRPC packages and use Zod `>=4.5` for the converter; this ordinary dependency adjustment is not a scope gate. Prefer experimental package-local dependencies where they suffice, leaving root catalog versions and current application consumers unaffected. The scaffold must not incidentally break current Homarr through shared dependency changes.
- No application-code rebuild is needed when a board is edited. Boards are runtime records, not generated source routes.

### Provisional implementer defaults

These defaults make the slice implementable; they are not decisions about Homarr's eventual production architecture.

- Start with the recorded Nitro `3.0.260903-beta` artifact and exact aligned oRPC pins. Resolve compatible Router, React, Vite, Query, database-connector, and UI dependencies together and record exact resolutions in the lockfile. Use released package exports rather than newer Nitro main documentation. An incompatibility is implementation evidence to report, not permission to silently change the approved stack.
- Prefer existing Bun workspace conventions, TypeScript, oxlint, oxfmt, and Mantine application primitives. Reuse only dependency-light public entrypoints whose actual production graph is acceptable; do not require reuse of Next-dependent Homarr packages. New contracts and adapters can remain within the isolated application for this proof.
- Begin with non-streaming full-document SSR and fixed locale/theme defaults. Create a fresh Router and QueryClient on every render miss, execute loaders through a request-authorized server adapter, serialize Router and Query state, and hydrate the exact document before starting browser refresh. Browser navigation uses the same-origin typed client, not server-only loader assumptions.
- Represent the public and private fixture boards with an immutable identifier, owner identity, fixed access policy, bounded content/layout/widget configuration, and monotonic render revision. One identity owns both boards; the second can view the public board but cannot edit either or read the private board. Anonymous access is public-read only. Permission editing and additional identity systems are unnecessary.
- Keep persistent fixture content and revision in SQLite. Initialize only absent fixtures; startup must not overwrite prior edits. A parameter-bound atomic compare-and-set updates content and revision together. Avoid introducing an ORM or assuming a promise-shaped database API provides transaction isolation. Explicitly own database close/disposal and initialization readiness.
- The bounded editor changes the board label, column/layout setting, and included widget display label. It submits an expected revision, receives the committed revision, exposes validation/conflict errors, and reconciles browser Query and Router state. The server always performs write authorization before commit.
- Fixture sessions use opaque random identifiers, HttpOnly same-site cookies, expiry, logout invalidation, and a bounded process-local store. Session state intentionally disappears on restart. Enforce the configured local origin/host and same-origin mutation checks for login, logout, edits, and source controls; reject mutations over read-only methods and unsupported mutation origins. Keep credentials and session tokens out of rendered/bootstrap data.
- Bind development access to loopback and clearly label fixture authentication as nonproduction. The container can listen on its internal interface but must be published only on host loopback, with the configured browser origin matching that mapping. This experiment does not authorize public deployment.

### Render and data boundaries

- Use one authorization policy for HTML, typed board/widget reads, saves, and REST reads. Missing or denied boards yield explicit non-success outcomes without private content. Authorization is evaluated before every artifact delivery, including cache hits; session lookup and authorization are never themselves cached into an artifact.
- Store a coherent render artifact: HTML, exact serialized loader/Query bootstrap, and the sanitized projection/revision/generation used to render it. Never combine an old HTML body with a newly fetched bootstrap value. Never retain live requests, session objects, routers, or QueryClients in cross-request storage.
- Key artifacts by board identity/revision, build and schema identity, included widget generation, and any visibility/capability/personalization variant represented in the HTML. Fixed locale/theme/layout inputs are explicit. Public artifacts cannot freeze an owner's editor affordances or identity into another visitor's response; private variants are isolated. Default downstream HTML/API policy is explicit `no-store`; reusable rendering is internal application caching, not shared HTTP caching.
- Define finite entry, byte, age, and in-flight bounds for render/widget caches; define finite capacity and expiry for sessions. Report chosen values as experiment configuration, not product performance promises. Oversized artifacts bypass caching, expired entries are removed, and saturated upstream work fails or degrades explicitly rather than growing an unbounded queue.
- Read a captured board revision and widget snapshot for each render. A save advances the durable revision; old in-flight renders may only populate their old key and cannot replace the current artifact. Widget refresh advances its generation on accepted data. Server render identity, backend widget state, browser Query state, and Router invalidation are distinct responsibilities.
- The sole source is a synthetic, controlled HTTP endpoint; an allowlisted server adapter fetches and validates it with response-size and deadline limits and bounded single-flight refresh. No arbitrary user URL or live integration credential is accepted. The source can run on the same listener/container. Browsers consume the authorized widget procedure, never the upstream endpoint as their widget API.
- Warm SSR includes a real cached widget value with observation time/generation. After hydration, browser polling obtains newer authorized widget state. Polling stops on unmount or lost access. Retain a bounded last-good value with a visible stale/error envelope on source failure; cold failure has an explicit unavailable state. Fixture-only source controls permit deterministic updates and failure/timeout observation under the same mutation protections.
- Separate oRPC execution, REST execution, and OpenAPI generation. Declare explicit input/output schemas and stable error outcomes for board read/save, widget read, and fixture session operations. The initial curated REST sample is board read, including public/private outcomes; it shares authorization and projections with the typed procedure. Serve one deliberately generated oRPC document with the correct base paths and security description, not a second competing Nitro-generated document. Schema security annotations do not execute access checks.
- One coordinator owns foundations, shared contracts, manifests, lockfile, and central registrations. Capability workers consume those interfaces read-only and own separate adapters/components. Final integration reconciles registrations and verifies the complete runnable slice.

## Testing Decisions

- The approved highest seams are HTTP HTML plus its authenticated bootstrap, and browser read/edit/refresh plus restart persistence. Observe externally visible content, access outcomes, revisions, and durable effects; implementation counters support cache attribution but do not replace user-visible checks.
- No new tests have been requested. This plan adds no unit, integration, or E2E suite. Run an existing check only when it directly covers changed experimental behavior; current Homarr's tRPC/Next-specific tests are not evidence for the new stack.
- Defer lint and typecheck until the full implementation is complete; add no new tests. Focused isolated dev/build/runtime probes are allowed when useful to make a composed slice runnable, with coordinator-owned scheduling of shared registrations, installs, outputs, ports, and disposable fixtures. Workers report actual bounded smoke evidence separately from pending complete-slice validation. Final integration owns scoped lint/typecheck for affected experimental packages and complete production build/container/browser/API/restart validation. Never run full-repository typecheck or broad suites for this experiment.
- Final HTTP smoke covers populated initial HTML with JavaScript disabled, matching bootstrap on render miss/hit, independent evidence of cache reuse, and anonymous/owner/viewer access through HTML and both API surfaces. Warm a private artifact before denied, expired-session, and logged-out requests; those requests must not disclose it. Session/mutation checks must reject foreign-origin requests as well as unauthorized saves.
- Final browser smoke covers hydration without recoverable mismatch, direct links/reloads/navigation, post-hydration source update, visible stale/error state, owner edit, denied viewer edit, and stale-revision conflict. Subsequent HTML must reflect the successful save without changing the application build identity. Bounded delayed rendering around a save must not restore the prior revision.
- Restart the application/container using only its dedicated fixture volume: committed content and revisions persist, in-memory caches and sessions start cold, and fixtures are not reseeded over edits. Observe clean startup/close and bounded cache/upstream behavior under the included workload.
- Measurement prior art is the recorded Homarr packaging/performance protocol and existing benchmark tooling, especially source/lockfile provenance, useful-board correctness gates, and separate cold/warm cache states. Adapt only necessary collection mechanics; do not import its historical parity matrix or Next/tRPC workload as requirements.
- Record exact source/lockfile, runtime/preset, database connector, image platform, fixture, cache policy, workload, sampling windows, and raw observations. Start with useful-board startup, cold/warm HTTP/browser behavior, container memory and process RSS, available CPU observations, browser asset transfer, and distinctly labeled image sizes. Unavailable measurements remain unavailable. A single run is exploratory, and an incomplete slice cannot establish whole-Homarr savings. No numerical resource or latency improvement is an acceptance gate.

## Out of Scope

- Replacing current Homarr, importing real appdata, production credentials, existing backups, or live external stores.
- Production identity providers, LDAP/OIDC, API-key/MCP/OAuth policy, full auth hardening, and public hosting of fixture authentication.
- Full widget/integration/editor parity, custom JSX, Assistant, uploads/media, translations, arbitrary source URLs, board creation/deletion, or permission administration.
- Existing tRPC clients, wire compatibility, Redis state conversion, production database migrations/backups, alternative database engines, and compatibility-driven staged retention.
- Multi-instance deployments, distributed locks/cache sharing, persistent sessions/widget caches, durable job queues, and complete scheduler/subscription migration. Polling suffices; Nitro tasks or WebSockets are not required to replace anything in this slice.
- Hono/Elysia/Eden, Nitro v2, TanStack Start, GitHub Pages, streaming SSR, islands/low-JS guarantees, and a framework/runtime benchmark matrix.
- New automated tests, intermediate lint/typecheck, mandatory numerical savings, and claims of production readiness.

## Further Notes

- Authority: [approved architecture/scope resolution](https://linear.app/ajnart/issue/AJN-492/choose-the-experimental-architecture-and-prototype-scope); [implementation spec root](https://linear.app/ajnart/issue/AJN-498/prove-a-cached-dashboard-on-nitro-v3); [architecture map](https://linear.app/ajnart/issue/AJN-482/find-the-route-to-a-lightweight-nitro-homarr). The implementation root is not a new wayfinder child. This document is a planning artifact; child implementation tickets remain drafts until approved and published by the coordinator.
- Prior reports and notes provide versioned evidence, not current scope instructions. In particular, earlier JSON persistence, optional Elysia, Node-first retained-stack proposals, prototype-before-spec sequencing, and lower worker-count suggestions are superseded by the approved scope here.
- Integration remains unexecuted: pinned Nitro/Router SSR and serialization, Bun/database connector packaging, and coherent artifact replay are feasibility questions to prove. They do not introduce another user scope decision or justify research loops before implementation.
- A positive result permits a later migration decision; it does not choose Homarr's final database/auth/cache/topology or prove a smaller complete product. The final evidence must list excluded capabilities and any blocked outcome.
