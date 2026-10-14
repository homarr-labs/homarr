# Prove Homarr’s fresh Nitro rewrite feasible

**Prove a fresh end-to-end rewrite with Nitro v3 + Vite + React, direct oRPC `2.0.0-beta.43`, and manual TanStack Router SSR; keep Elysia optional.**
Every package can be upgraded and every application interface redesigned: this is a feasibility experiment, not an incremental compatibility port.
Nitro v3/Vite are required; the suggested contract/router stack is not an approved final design. Complete Homarr parity is an eventual migration goal,
not a prerequisite for the first disposable proof. Use isolated fixtures, simple prototype state/auth and runtime board edits without app rebuilds.
The named Nitro TanStack “SSR” example is actually CSR; real SSR requires explicit integration. No numeric RAM saving is known.
Agree a bounded spike, build it later in the same worktree, then use its findings to shape final decisions and parallel rewrite work.
([API evidence](../research_notes/Homarr%20Nitro%20v3%20stack%20choices/orpc-elysia.md), [Rendering evidence](../research_notes/Homarr%20Nitro%20v3%20stack%20choices/tanstack-rendering.md))

**Scope and authority.** This October 10, 2026 synthesis supplements, rather than edits, the historical [migration report](Homarr%20Nitro%20migration%20experiment.md) and its notes.
The [Find the route to a lightweight Nitro Homarr](https://linear.app/ajnart/issue/AJN-482/find-the-route-to-a-lightweight-nitro-homarr) map owns current choices; reports supply evidence/proposals, not approvals.
This update reflects the user's full-rewrite freedom and updated map. Historical reports/notes remain evidence, not current planning instructions.
No implementation, install, prototype, measurement, lint or typecheck was performed. GitHub Pages is excluded; real user data stays untouched.

## Separate Nitro hosting from API contracts and optional Elysia

| Responsibility | Suggested disposable slice | What it does not decide |
| --- | --- | --- |
| Server/build | Pinned Nitro v3 + Vite; one listener on an available compatible development runtime | Final Node/Bun choice, production topology or deployment support. |
| UI/rendering | Fresh React viewer/editor; Router SSR with explicit Query hydration | Final component reuse, Start adoption, all-widget SSR or low-JS strategy. |
| Procedures | New typed board read/save and widget read through aligned oRPC beta.43 packages | Existing tRPC clients, paths and wire formats need not survive this spike. |
| REST/spec | Small explicit-schema REST surface and separately generated oRPC document | Final public compatibility/versioning policy. |
| Additional HTTP framework | No Elysia in the minimal baseline | Add compiled Elysia only for a named native-route/plugin benefit outside oRPC. |
| State/auth | Isolated file-backed JSON fixtures + bounded in-memory render/widget caches; fixture-only login/session | Final DB/ORM/cache/auth architecture, production security and all background jobs. |

The inspected artifact is `nitro@3.0.260903-beta`; choose and record an exact v3 release/nightly and matching APIs for reproducibility, not compatibility with old pins.
Packages can move together. Released Nitro uses `nitro/storage`/`storage.cache`, while inspected main has newer `kv`/cache-driver APIs.
([Nitro release](https://registry.npmjs.org/nitro/3.0.260903-beta), [Versioned rendering investigation](../research_notes/Homarr%20Nitro%20v3%20stack%20choices/tanstack-rendering.md))

Nitro owns listening and the outer HTTP lifecycle. Register explicit RPC/REST prefixes and preserve page-renderer fallthrough;
a fallback `server.ts` is not global middleware because specific Nitro routes take precedence. Elysia mounting uses a compiled Fetch app, not a second `.listen()`.
Its oRPC wildcard adapter disables body parsing (`parse: 'none'`) so oRPC receives the original Request.
**Eden types native Elysia routes, not automatically the inner oRPC procedures.** Keep oRPC-owned contracts distinct from an optional Elysia host.
([Nitro entry](https://nitro.build/docs/server-entry), [oRPC/Elysia adapter](https://orpc.dev/docs/adapters/elysia), [Eden](https://elysiajs.com/eden/overview))

**Memory is a hypothesis, not a stack property.** Nitro's compiled/lazy dispatch offers plausible simplification, but nested Elysia does not remove Nitro's outer router.
The existing app is a baseline/reference, not a mandatory source of services to retain. Measure prototype container memory/RSS, image size and useful-board behavior later,
explicitly listing omissions; a smaller incomplete slice cannot establish a whole-Homarr saving. Final budgets can follow exploratory measurements.
([Runtime baseline and protocol](../research_notes/Homarr%20Nitro%20migration%20experiment/performance-packaging.md), [Node memory semantics](https://nodejs.org/api/process.html#processmemoryusage))

## Let oRPC own contracts and one curated OpenAPI document

**Beta.43 exists and supplies end-to-end TypeScript inference without Elysia or client code generation.** Code-first uses server router types;
contract-first separates the public contract from implementation. Standard Schema inputs validate at runtime, while inferred handler outputs are compile-time only:
explicit `.output` schemas are needed for runtime result validation and reliable public response schemas.
([Exact server manifest](https://registry.npmjs.org/@orpc/server/2.0.0-beta.43), [Contracts](https://orpc.dev/docs/contract-first), [Procedures](https://orpc.dev/docs/procedure))

**The optional `@orpc/zod@2.0.0-beta.43` converter requires Zod `>=4.5.0`; Homarr currently specifies `4.4.3`.**
Upgrade Zod with the fresh stack: this is an ordinary dependency detail, **not an approval gate or reason to retain old interfaces**.
Query utilities provide typed options/keys and abort forwarding; implement the slice's invalidation, session isolation and SSR serialization explicitly.
([Exact converter peer](https://registry.npmjs.org/@orpc/zod/2.0.0-beta.43), [Standard Schema](https://orpc.dev/docs/integrations/standard-schema), [Query integration](https://orpc.dev/docs/integrations/tanstack-query))

Keep three jobs distinct: **`RPCHandler` executes RPC; `OpenAPIHandler` executes REST; `OpenAPIGenerator` generates a schema document.**
Serve that document/UI deliberately. Nitro's experimental generator reads explicit `defineRouteMeta`/`handlersMeta`, generating OpenAPI 3.1;
it does not inspect nested oRPC/Elysia registries. Beta.43 oRPC generation defaults to 3.2 and supports deliberate downgrading, with `QUERY` operations unable to downgrade below 3.2.
For the spike, generate and serve one small oRPC document with matching mounted paths; use no competing Nitro/Elysia public-spec authority.
Final multi-surface documentation can add operations or merge deliberately, with version/base/component/security consistency.
([Released oRPC generator](https://unpkg.com/@orpc/openapi@2.0.0-beta.43/dist/index.d.mts), [Nitro generator source](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/runtime/internal/routes/openapi.ts))

Schema security declarations do not execute authorization. RPC rich-value serialization differs from SuperJSON; REST serialization is one-way,
and oRPC SSE is not Assistant UI-message framing. Fresh clients can use fresh contracts; no tRPC bridge/retention is required for this proof.
([OpenAPI specification](https://orpc.dev/docs/openapi/specification), [RPC serialization](https://orpc.dev/docs/rpc/serializer), [REST serialization](https://orpc.dev/docs/openapi/serializer))

**Keep the eventual capability ledger, not every old implementation.** Login/provider identity, session expiry/revocation, public/private permissions,
secret access, MCP/OAuth/catalog policy, uploads, Assistant and all four subscriptions remain final-rewrite obligations, with explicit interface-change dispositions.
Auth/MCP/transport security boundaries cannot be replaced by generated types; stream cancellation, bounded queues and lifecycle require application work.
LDAP/OIDC, existing auth mechanics, full public-client compatibility and live transports can be omitted from the first slice if omissions are recorded.
([Capability/auth inventory](../research_notes/Homarr%20Nitro%20migration%20experiment/api-auth-migration.md), [Transport limits](../research_notes/Homarr%20Nitro%20v3%20stack%20choices/orpc-elysia.md))

## Build real Router SSR and cache coherent authorized artifacts

**`vite-ssr-tsr-react` is CSR despite its name:** the page says “Client-side routing,” the root starts empty, and `src/main.tsx` calls `createRoot`, not `hydrateRoot`.
The tagged directory has no server entry/renderer, dehydration or render cache; its browser-relative `/api/hello` loader is not an SSR auth adapter.
The inspected main and release-tag entries are identical, so this is not just recent branch drift.
The separate **`vite-ssr-react`** example genuinely uses a Request/Response server entry, `renderToReadableStream` and `hydrateRoot`, but adds no Router loader serialization.
([Named example](https://nitro.build/examples/vite-ssr-tsr-react), [Tagged client source](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/examples/vite-ssr-tsr-react/src/main.tsx), [Tagged directory](https://github.com/nitrojs/nitro/tree/v3.0.260903-beta/examples/vite-ssr-tsr-react), [Genuine React SSR entry](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/examples/vite-ssr-react/src/entry-server.tsx))

Manual Router SSR needs a fresh router and QueryClient per request, environment-specific authorized loader execution, root document/assets/providers,
Router dehydration plus explicit Query hydration, and a client `hydrateRoot` entry. Router loaders also run in browser navigation; they are not server-only functions.
Router's SSR APIs are experimental and share Start internals; Start is separately framework-owned SSR/server-function infrastructure.
Begin with non-streaming SSR so HTML/bootstrap replay is inspectable; streaming requires Router's own serialization/stream helpers, not React streaming alone.
([Router SSR](https://tanstack.com/router/latest/docs/framework/react/guide/ssr), [External Query data](https://tanstack.com/router/latest/docs/framework/react/guide/external-data-loading), [Start](https://tanstack.com/start/latest/docs/framework/react/overview))

Proposed cache flow: authorize → sanitize/normalize render inputs → read backend widget caches → render and store **matching HTML + loader/Query snapshot**.
On a hit, authorize again before returning that artifact; hydrate its exact snapshot, then refresh widget values. Never cache a live request/session/router/QueryClient.
Keep assets, HTML, backend widget values and browser caches distinct. Commit edits with render revisions; invalidate Query/Router separately from server render keys.
Key or isolate locale/theme/layout/personalization/build/schema inputs and included widget generations; bound bytes/variants/retention explicitly.
Permission revocation gates delivery independently of TTL, and private responses need explicit downstream policy. Runtime board records avoid per-board builds;
build-time prerendering is not mutable-board regeneration. Full hydration still executes React/providers/widget code, so SSR is not a low-JS guarantee.
([React matching-state contract](https://react.dev/reference/react-dom/client/hydrateRoot), [Released cache](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/docs/1.docs/7.cache.md), [Cache/security design](../research_notes/Homarr%20Nitro%20migration%20experiment/dashboard-rendering.md))

## Agree a small feasibility spike before specifying the rewrite

Current flow: **bounded scope → throwaway same-worktree prototype → findings/final decisions → to-spec → to-tickets → adapted parallel build**.
Use wayfinder to resolve one human scope choice at a time; the tiny spike needs a clear question and observable outcome, not a detailed migration spec.
[Choose the experimental architecture and prototype scope](https://linear.app/ajnart/issue/AJN-492/choose-the-experimental-architecture-and-prototype-scope) is unblocked and waits only on completed research.
It chooses provisional contract/auth/render/state scope with the user, not the entire final architecture. The map now has **15 children: seven completed research and eight open decision/prototype tickets**.

[Agree performance budgets and representative workloads](https://linear.app/ajnart/issue/AJN-490), [Choose dashboard first paint and cache semantics](https://linear.app/ajnart/issue/AJN-495/choose-dashboard-first-paint-and-cache-semantics),
[Choose state lifetimes and deployment concurrency](https://linear.app/ajnart/issue/AJN-493/choose-state-lifetimes-and-deployment-concurrency) and [Choose API contracts and auth migration boundaries](https://linear.app/ajnart/issue/AJN-494/choose-api-contracts-and-auth-migration-boundaries)
no longer block disposable scope. They join [Validate the cached dashboard experience](https://linear.app/ajnart/issue/AJN-485) and [Validate the single container runtime footprint](https://linear.app/ajnart/issue/AJN-491)
in blocking [Choose the capability preserving migration route](https://linear.app/ajnart/issue/AJN-484). Container comparison can precede final budgets, with slice omissions and comparison limits explicit.

Suggested first proof: **fixture login/private board → typed oRPC read → cached populated SSR + matching bootstrap → widget update → edit invalidation → restart**.
Use copied/disposable records in a dedicated fixture directory, never real `/appdata` or live external stores. Prototype login can select one of two synthetic identities,
issue an opaque HttpOnly same-origin fixture session and enforce owner/viewer/denied reads; bind locally and label it nonproduction auth.
File-backed JSON preserves edited fixture revisions across restart; in-memory caches intentionally cold-start. This proves that chosen lifetime only, not final database/concurrency semantics.
Observe populated HTML before JS, coherent hydration, authorized cache hits, rebuild-free saves/new boards and useful updates. Add races/revocation as bounded follow-on proofs,
not an all-capability prerequisite; record excluded providers, widgets, transports, jobs, backup/conversion and production hardening.

For the later build, **stock implement-spec cannot run unchanged**: separate worktrees and per-worker TDD conflict with this experiment's rules.
One writer first establishes foundation contracts/bootstrap; ready independent lanes then run with exclusive file ownership. Coordinator owns manifests/lockfiles/shared registry/contracts.
Workers consume the canonical scope/spec/ticket and named decisions, block consumers on interface changes, and write bounded notes with changed interfaces,
evidence/deferred checks, blockers and exact next consumption pointers. Final integration reconciles registrations and the capability ledger.
Propose 2–3 adjustable workers, not an approved count; use Sol high within medium-to-xhigh and actual available model/variant IDs.
Shared uncommitted edits stay in place: no branch switching, checkout/reset or overwriting another owner. Expand-contract adapters are optional tools where rollout needs them, not the feasibility baseline.

**No lint/typecheck until FULL implementation completion; targeted affected-package checks afterward, NEVER full-repository typecheck.**
New tests require explicit user request. Research/doc edits need no code checks; worker editing completion is not final validation.

## Conclusion

The question is now **“can we build this fresh end to end?”**, not “can we port every existing seam unchanged?” Nothing requires tRPC, Redis or Drizzle in the first proof.
Use the spike to discover working integration and actual tradeoffs; then specify the complete rewrite, including durable-data conversion and capability/security coverage.
Real-data migration and production parity remain later gates. A successful small prototype justifies the next experiment—not a final DB/runtime choice or a smaller-RAM claim.
