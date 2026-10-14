# Nitro feasibility: draft implementation tickets

Status: DRAFT, awaiting user approval. These are proposed children of [Prove a cached dashboard on Nitro v3](https://linear.app/ajnart/issue/AJN-498/prove-a-cached-dashboard-on-nitro-v3), not published issues or wayfinder children. Names are the blocking references until publication; no identifiers are reserved.

Each ticket delivers a bounded observable outcome or the explicit foundation exception. Vertical slices should be demonstrable once composed with their dependencies. Focused isolated dev/build/runtime probes are allowed when useful, with coordinator scheduling to avoid races over shared registrations, installs, outputs, ports, and fixtures. Editing completion or bounded smoke evidence is not a complete-slice green result: lint/typecheck and full integration validation remain deferred to the final ticket after every modifying ticket finishes. No new tests are included; notes distinguish actual evidence from pending outcomes.

## 1. Establish the isolated Nitro fixture foundation

**Blocked by:** None.

**What to build:** Establish the necessary shared scaffold and contracts so capability workers can complete independent behaviors without touching shared registrations or dependency files. This is the explicit foundation exception to vertical slicing, not a claim that an application shell proves feasibility.

**Owned boundary:** One writer owns the workspace/dependency setup, database initialization and repository, shared schemas, request context, typed client/server composition, page/component extension points, and all initial registrations. Future capability modules are initialized with safe placeholder exports and transferred to their named owners after the foundation handoff. Authentication placeholders allow public reads only and deny private reads and all writes.

**Acceptance criteria:**

- [ ] Pin the recorded Nitro v3 beta, aligned direct oRPC beta.43 packages, compatible Vite/React/Router/Query and Bun database dependencies; include Zod `>=4.5` where needed and exact lockfile resolutions.
- [ ] Prefer experimental package-local dependency versions where sufficient; leave root catalog versions and current application consumers unaffected rather than incidentally breaking Homarr during scaffold work.
- [ ] The isolated application has its own dev/build/start and scoped lint/typecheck entrypoints, a Nitro-owned listener, and no Next/tRPC/Redis-dependent Homarr packages in its production graph.
- [ ] Explicit disposable SQLite initialization creates only absent public/private fixtures and two identities. Stable read and atomic expected-revision commit interfaces preserve committed data on restart.
- [ ] Define schemas and error outcomes for board read/save, widget reads, sessions, sanitized rendering projections, widget generations, and coherent bootstrap artifacts. Consumers know which fields are trusted server context and which are browser-safe.
- [ ] Provide a minimal diagnostic landing response and typed public fixture read; source-level composition for later pages, session handling, widget source/control, RPC, REST, and documentation is registered centrally and fails safely while unavailable.
- [ ] Seed a browser-safe widget snapshot and supply an inert widget component/snapshot adapter that displays it with observation metadata. This lets the rendering slice demonstrate populated HTML independently of later HTTP-source polling; source controls and refresh remain unavailable until their owner implements them.
- [ ] Hand off finite configuration defaults and stable hooks for authorization, widget snapshots, render identity, editor mounting, and close/disposal. Every later slice can edit its own modules without generating routes or changing shared files.
- [ ] Foundation completion notes name exact ownership transfers, interfaces, resolved dependency choices, any coordinated build/runtime probe evidence, and pending full validation. Claim only the buildability actually observed, not complete-slice correctness.

## 2. Serve a populated cached board with matching hydration

**Blocked by:** Establish the isolated Nitro fixture foundation.

**What to build:** An anonymous visitor can open the public board and receive actual board content and the seeded widget snapshot before JavaScript, then hydrate and navigate without discarding that state. The same renderer accepts the foundation's authorization/projection interface so private access can be integrated without another rendering fork.

**Owned boundary:** Board viewer, manual SSR/browser hydration adapters, and internal render-artifact cache. Shared route tables, contracts, session services, and widget/editor implementations are read-only. Consume widget/editor slots without changing their implementations.

**Acceptance criteria:**

- [ ] A runtime board parameter selects database records rather than per-board generated source. Direct links, reloads, and browser navigation use correct production assets/providers.
- [ ] Create request-local Router/Query state, authorized server loaders, a complete rendered document, safe serialization, and exact Router/Query hydration before refresh.
- [ ] Initial HTML includes the board label/layout and seeded widget value with its observation metadata; a warm authorized repeat request reuses the same coherent artifact without rerunning React rendering.
- [ ] Bound entries/bytes/age/in-flight work and expose cache-hit/miss/render evidence. Cache identity covers revision/build/schema/widget generation and rendered capability variants.
- [ ] Reauthorize every artifact delivery, emit explicit downstream `no-store`, and keep live session/request objects out of cached state. Late old-revision rendering cannot replace the current revision.
- [ ] Hand off the unchanged snapshot/refresh/editor extension points, any actual bounded browser/HTTP evidence, and pending complete-slice validation to the final verifier.

## 3. Select fixture identities and enforce private-board access

**Blocked by:** Establish the isolated Nitro fixture foundation.

**What to build:** A browser user can select one synthetic identity, read session status and permitted board data, and log out. The owner can read the private board through the typed API; the other identity and anonymous requests cannot. The shared access adapter also protects the renderer once the rendering slice is complete.

**Owned boundary:** Fixture-session service, authorization projection, login/session UI, and session procedure implementations. The renderer and central registrations are read-only. This slice's independent end-to-end demonstration is login plus authorized/denied API reads; private HTML demonstration is reconciled in final integration.

**Acceptance criteria:**

- [ ] Exactly two synthetic identities are selectable and the nonproduction/local-only limitation is visible. One owns both fixtures; the second has public-read access only.
- [ ] Opaque HttpOnly same-site session cookies, finite expiry/capacity, logout invalidation, and restart cold-start are explicit. No session token enters a DTO/bootstrap.
- [ ] Board/widget reads and saves consult the shared live access policy, not client controls or schema security annotations. Owner, viewer, missing, anonymous, and denied outcomes are distinguishable without private content disclosure.
- [ ] Same-origin/host protections cover session-changing operations and provide the guard consumed by board edits and source controls; malformed or foreign-origin mutations fail closed.
- [ ] Warm private artifacts are still gated by current session/access state. Authorization changes require no renderer, contract, or registry edits by this worker.
- [ ] Hand off session/access consumers, any actual bounded smoke evidence, and pending logout/expiry/private-cache verification explicitly.

## 4. Refresh the included widget from a controlled HTTP source

**Blocked by:** Serve a populated cached board with matching hydration; Select fixture identities and enforce private-board access.

**What to build:** A hydrated dashboard updates its single widget from a synthetic HTTP source through an authorized typed procedure, while retaining useful last-good content and visible stale/error states during bounded source failures.

**Owned boundary:** Controlled source and protected fixture controls, bounded server fetch/cache adapter, widget procedure implementation, and widget component/refresh lifecycle. Consume renderer snapshot/generation hooks and auth guards; central routes and schemas stay read-only.

**Acceptance criteria:**

- [ ] Serve a deterministic controlled HTTP source on the same listener/container with fixture-only value/failure/delay controls; no arbitrary URL or real credential is accepted.
- [ ] Fetch upstream only on the server with fixed allowlisting, response validation/size limits, deadlines, finite retention/in-flight bounds, and refresh coalescing.
- [ ] Populate SSR from a captured backend widget snapshot, then begin authorized browser polling only after exact hydration. New values advance a generation and refresh the visible widget without an application rebuild.
- [ ] Record observation time/freshness and expose bounded stale-on-error or cold-unavailable state. Browser cancellation/unmount/lost access stops polling; failures do not destroy the board.
- [ ] Source controls use the approved session/mutation guard. Private widget reads remain denied even after another user warms its data/render caches.
- [ ] Hand off deterministic source-control steps, any coordinated HTTP/browser probe evidence, and pending complete-slice observations.

## 5. Save runtime board edits with revision-safe persistence

**Blocked by:** Serve a populated cached board with matching hydration; Select fixture identities and enforce private-board access.

**What to build:** The fixture owner can edit a board label, column/layout setting, and widget display label, save them, and see the committed board without rebuilding. A denied viewer cannot save; a stale revision cannot overwrite a newer edit. The same saved content survives restart.

**Owned boundary:** Board-save procedure/service and bounded editor UI. Consume the foundation repository/commit schema, shared mutation/access guard, and renderer invalidation hooks read-only. Editing display settings does not change the source/refresh worker's protocol or component.

**Acceptance criteria:**

- [ ] Mount an owner-only editor through the declared viewer slot and submit validated bounded settings through the typed save procedure.
- [ ] Perform server-side owner and same-origin checks before an atomic expected-revision commit; return the new revision and explicit validation/conflict outcomes.
- [ ] Reconcile browser Query and Router state and server render identity separately. Subsequent HTML shows committed settings under the same build identity; old artifacts become unreachable by current keys.
- [ ] Viewer saves are rejected even when called directly, and two stale copies cannot silently overwrite each other. Conflict feedback preserves the user's pending edit.
- [ ] Startup seeding leaves committed content/revisions intact; the restart demonstration needs only the experiment's fixture volume, not current Homarr data.
- [ ] Hand off edit/revision/restart observation steps, actual bounded probe evidence where available, and deferred full validation; do not change shared repository/contracts unless the coordinator accepts an interface revision.

## 6. Expose one authorized REST sample and its OpenAPI document

**Blocked by:** Select fixture identities and enforce private-board access.

**What to build:** A REST consumer can read the public board, obtain an authorized private-board read with the fixture session, and receive a real denial without it. A deliberately served document describes that exact mounted board-read surface.

**Owned boundary:** Curated REST/OpenAPI adapter and documentation surface. Board-read contracts and authorization/repository services are read-only. This read-only sample does not depend on the widget refresh or save implementations.

**Acceptance criteria:**

- [ ] Mount the explicit board-read operation using oRPC REST execution, separate from RPC execution and document generation.
- [ ] Use the same access policy, sanitized projection, input/output validation, and documented errors as the typed board-read procedure.
- [ ] Serve one oRPC-generated document with a deliberately selected supported OpenAPI version, correct prefixes/paths/components, and truthful session security description. Do not expose a competing Nitro-generated spec.
- [ ] The document and a concise example demonstrate public success, authorized private success, and denial; session tokens and implementation secrets are absent.
- [ ] Hand off final document/route verification steps, any generator version constraint and actual bounded generation/endpoint probe evidence; mark unexecuted outcomes pending.

## 7. Package the isolated fixture application in one container

**Blocked by:** Establish the isolated Nitro fixture foundation.

**What to build:** Provide the packaging path that takes the experimental production output into one Bun-first container, with assets, an isolated durable fixture volume, and local-only host access. It packages whatever capability modules the application includes without hard-coding a partial feature list.

**Owned boundary:** Experiment-only container definition, run configuration, and concise operator instructions. Dependency manifests, lockfile, application configs/registrations, current Homarr's Dockerfile, and current benchmark scripts are read-only.

**Acceptance criteria:**

- [ ] Package server/assets and necessary runtime dependencies only; keep builder tools out of the final application image. No Next/tRPC/Redis services or dependent Homarr packages enter its production graph.
- [ ] Use the declared Nitro Bun preset/runtime and explicit Bun SQLite connector; startup initializes only the dedicated fixture database and readiness is tied to initialization.
- [ ] Bind host publication to loopback and document the matching configured origin, fixture-auth warning, isolated volume, restart behavior, and signal/close ownership.
- [ ] Source/lockfile/runtime/platform/output provenance is available for final measurement. Distinguish internal container binding from external host exposure.
- [ ] The recipe remains usable after other capability slices finish without this worker editing their code or central registrations. Coordinated isolated container build/start probes may demonstrate the composed slice; complete build/start/restart validation and footprint evidence remain final integration's responsibility.

## 8. Integrate and verify the complete feasibility slice

**Blocked by:** Establish the isolated Nitro fixture foundation; Serve a populated cached board with matching hydration; Select fixture identities and enforce private-board access; Refresh the included widget from a controlled HTTP source; Save runtime board edits with revision-safe persistence; Expose one authorized REST sample and its OpenAPI document; Package the isolated fixture application in one container.

**What to build:** Reconcile all capability registrations and interfaces, then produce a runnable, verified experiment and bounded evidence of its actual behavior and footprint. This is the only ticket that promises green lint/typecheck and complete-slice acceptance validation; earlier tickets may supply bounded evidence from coordinated probes.

**Owned boundary:** Coordinator integration and final verification after every modifying worker relinquishes ownership. Any necessary fixes reopen the affected ownership claim; completion waits for the resulting changes and renewed scoped checks.

**Acceptance criteria:**

- [ ] Consume every worker handoff, reconcile contracts and registrations, and verify the experimental server/browser dependency graph excludes the prohibited application stack without modifying current Homarr behavior.
- [ ] After full implementation only, run scoped lint/typecheck for the experimental affected packages, build its production output/container, and record commands/results. Never invoke full-repository typecheck or broad suites; add no tests.
- [ ] Demonstrate populated HTML before JavaScript, attributable render-cache reuse, matching hydration, direct links/reloads/navigation, authorized private hits, and anonymous/viewer/logout/expired-session denials across HTML/bootstrap/RPC/REST/widget access.
- [ ] Demonstrate protected session/source/edit mutations, deterministic widget update and stale/error handling, owner save under the unchanged application build, rejected viewer and stale-revision saves, and late-render revision safety.
- [ ] Restart with the same isolated fixture volume: edits/revisions survive; sessions and caches cold-start; seeding preserves edits. Observe initialization, bounded work/retention, and close/disposal in the one-container run.
- [ ] Collect exploratory startup/cold-warm/cache/browser/container memory/process RSS/available CPU/asset transfer/image observations with provenance, raw evidence, unavailable fields, and measurement boundaries. No invented savings target or parity claim gates acceptance.
- [ ] Summarize verified outcomes, unresolved implementation failures, chosen defaults, excluded capabilities, and whether the highest seams actually work. Mark an unproved outcome blocked rather than treating deferred checks as a pass.

## Ready frontier and approval

- Start with the foundation alone. Its shared contracts, dependency files, and registrations require one writer.
- After the foundation handoff, rendering, fixture access, and packaging can run concurrently: three workers with distinct owned boundaries.
- Once fixture access finishes, REST/OpenAPI is ready independently of rendering. Once rendering and fixture access both finish, widget refresh and board editing are ready independently of each other and of REST/packaging.
- The maximum ready, non-overlapping implementation frontier is **four**: widget refresh, board editing, REST/OpenAPI, and packaging, if none has finished early. Up to twelve Sol high workers are permitted, but this graph does not justify twelve simultaneous writers. Completion can make the actual frontier smaller.
- Final integration starts only after all seven modifying tickets finish. Central registration patches between handoffs remain the coordinator's job, not a new worker lane. Focused composed-slice probes require coordinated ownership; lint/typecheck and complete-slice validation remain deferred.

For the coordinator's approval quiz: does this granularity feel right, are these genuine blocking edges, and should any slices be merged or split? Publish child tickets and native blocking relationships only after the user approves this draft.
