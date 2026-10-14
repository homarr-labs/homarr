# Nitro runtime and H3/Hono/Elysia compatibility

Research for [AJN-487](https://linear.app/ajnart/issue/AJN-487/establish-nitro-capabilities-and-router-compatibility). Checked 2026-10-10. Research only: no dependency installation, prototype, build, benchmark, branch change, or Linear modification. Context7 was consulted for Nitro, Hono, and Elysia APIs; primary docs, npm registry metadata, and release-tagged source were used to validate its results. Conclusions below distinguish documented capability from Homarr-specific inference.

## Which versions and package names are current, and which documentation applies?

### Takeaway

The stable Nitro 2 package is `nitropack@2.13.4`; the Nitro 3 package is `nitro@3.0.260903-beta`, even though its npm tag is `latest`. Current nitro.build documentation follows the evolving v3 line, not a frozen description of that published beta. — [Nitropack registry](https://registry.npmjs.org/nitropack); [Nitro registry](https://registry.npmjs.org/nitro); [Migration guide](https://nitro.build/docs/migration)

### Cited Findings

- Live registry snapshot: `nitropack` has `latest: 2.13.4`, published 2026-04-29; `nitro` has `latest: 3.0.260903-beta`, published 2026-09-03. A `latest` tag does not make the beta version a stable v3 release. — [Nitropack metadata](https://registry.npmjs.org/nitropack); [Nitro metadata](https://registry.npmjs.org/nitro)
- The nightly package is `nitro-nightly`, with `latest: 3.0.1-20261008-023340-cef53050`, published 2026-10-08. Official documentation installs it under the dependency name `nitro` using an npm alias, not a direct `nitro-nightly` import. — [Nightly metadata](https://registry.npmjs.org/nitro-nightly); [Nightly channel](https://nitro.build/docs/nightly)
- Inspected main commit: `cef5305050325a36601ff118b9651d43a0f9ba58`, committed 2026-10-08. Its package.json still says `3.0.260903-beta`, despite changed dependencies and exports. Package.json version alone is therefore insufficient to identify source behavior. — [Commit](https://github.com/nitrojs/nitro/commit/cef5305050325a36601ff118b9651d43a0f9ba58); [Pinned main package.json](https://github.com/nitrojs/nitro/blob/cef5305050325a36601ff118b9651d43a0f9ba58/package.json)
- Nitro 2 declares H3 `^1.15.11`; the released Nitro 3 beta declares H3 `^2.0.1-rc.31`, unstorage `^2.0.0-alpha.10`, and unenv `^2.0.0-rc.24`. Current main declares H3 `^2.0.1`. These are dependency ranges, not proof of the versions a particular lockfile resolves. — [Nitropack metadata](https://registry.npmjs.org/nitropack); [Beta package.json](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/package.json); [Pinned main package.json](https://github.com/nitrojs/nitro/blob/cef5305050325a36601ff118b9651d43a0f9ba58/package.json)
- Both inspected latest Nitro package manifests require Node `^20.19.0 || >=22.12.0`, stricter than the migration guide's broad “Node 20+” wording. The beta's `compatiblePackages` declares Vite `^7 || ^8`, Rollup `^4`, and Rolldown `>=1.0.0`; this metadata is not an installation test. — [Registry](https://registry.npmjs.org/nitro); [Beta manifest](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/package.json); [Migration guide](https://nitro.build/docs/migration)
- Adjacent framework snapshot: H3 `latest: 2.0.2`, Hono `latest: 4.13.13` / `next: 5.0.0-rc.1`, Elysia `latest: 1.4.30` / `next: 2.0.0-beta.29`. Nitro's beta examples declare Hono `^4.12.9` and Elysia `^1.4.28`; they do not establish Hono 5 or Elysia 2 compatibility. — [H3 metadata](https://registry.npmjs.org/h3); [Hono metadata](https://registry.npmjs.org/hono); [Elysia metadata](https://registry.npmjs.org/elysia); [Hono example manifest](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/examples/hono/package.json); [Elysia example manifest](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/examples/elysia/package.json)

### Inferences

- Pin a release or exact nightly and its lockfile before a future experiment. Do not combine moving `latest` dependencies with moving documentation and call the result a reproducible comparison. The evidence supports investigating v3, not treating it as stable. — [Registry](https://registry.npmjs.org/nitro); [Living migration guide](https://nitro.build/docs/migration)

### Gaps

- No installation was performed, so dependency-range resolution and complete framework/plugin compatibility remain unverified. No stable Nitro 3 release appeared in the inspected registry snapshot; tags can change after this date.

## How does Nitro's Vite integration work?

### Takeaway

Nitro 3 supplies `nitro()` from `nitro/vite`: one Vite development environment and one build producing frontend and server output. This is build/deployment integration, not a requirement to generate board configuration into the frontend. — [Vite integration](https://nitro.build/docs/vite); [Routing](https://nitro.build/docs/routing)

### Cited Findings

- `vite dev` combines frontend development and Nitro routes; server code runs in an isolated worker and reloads on changes, while frontend modules retain Vite HMR. `vite build` produces `.output/`; `vite preview` serves it through Nitro. The documentation explicitly distinguishes server reloads from HMR for server-only modules. — [Vite integration](https://nitro.build/docs/vite)
- Nitro composes with frontend Vite plugins, including React. It detects `entry-server.(ts|js|tsx|jsx|mjs)` in the root, `app/`, `src/`, or server directory for SSR. SSR is available, not mandatory for an API plus client-rendered frontend. — [Vite integration](https://nitro.build/docs/vite)
- Configuration can live in `nitro.config.ts`, Vite's `nitro` key, or inline `nitro()` options, with inline options taking precedence. The released beta exports `nitro/vite`. — [Vite integration](https://nitro.build/docs/vite); [Beta exports](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/package.json)
- Current docs describe standalone `rolldown`, `rollup`, and `vite` builders. They say builders are installed on demand, whereas the released beta still lists Rolldown as a dependency. This is a concrete docs/release difference. — [Vite builders](https://nitro.build/docs/vite); [Beta manifest](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/package.json)
- Filesystem scanning is opt-in via `serverDir` or `scanDirs` in v3. Creating `server/routes/` without enabling scanning is insufficient; explicit `routes` configuration is another route-registration mechanism. Auto-imports were removed. — [Migration](https://nitro.build/docs/migration); [Routing](https://nitro.build/docs/routing); [Beta configuration types](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/types/config.ts)

### Inferences

- A static client shell plus runtime APIs is consistent with rebuild-free board edits: board data must stay in the existing persistence/API path rather than become build input. Code changes can still rebuild. Standalone server builds also leave frontend/backend separation possible. These are architecture choices, not guarantees that existing Homarr behavior survives migration. — [Vite integration](https://nitro.build/docs/vite); [Prerendering](https://nitro.build/docs/prerendering)

### Gaps

- Existing Homarr authentication, tRPC, Next-specific rendering, widgets, image handling, and long-running jobs were not ported or validated. Vite plugin availability alone does not establish compatibility with them.

## How do H3, Hono, and Elysia fetch handlers integrate, and is a second router worthwhile?

### Takeaway

All three can supply a Web Request/Response handler to Nitro 3. Hono or Elysia adds another HTTP framework inside Nitro; it does not remove Nitro's outer H3 lifecycle. Prefer native Nitro handlers or existing protocol adapters unless a concrete middleware, schema, or portability requirement justifies the extra layer. — [Server entry](https://nitro.build/docs/server-entry); [Beta app generator](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/build/virtual/app.ts)

### Cited Findings

- Official server-entry examples export an H3 v2 app, a Hono app, or `app.compile()` for Elysia. The published beta tag contains working-shaped Hono and Elysia examples using those exports. They demonstrate the integration contract, not full application coverage. — [Server entry](https://nitro.build/docs/server-entry); [Tagged Hono entry](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/examples/hono/server.ts); [Tagged Elysia entry](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/examples/elysia/server.ts)
- A `server.ts` entry is a fallback catch-all: specific Nitro routes take precedence. Current docs contain a broad “all incoming requests” sentence but their warning, lifecycle diagram, and examples explicitly limit the entry to unmatched requests. Authentication or logging only in that entry does not cover separately matched Nitro routes. Use Nitro middleware/hooks for genuinely global concerns. — [Server-entry lifecycle and warning](https://nitro.build/docs/server-entry)
- Nitro's beta app generator instantiates `H3Core`; generated route matching comes from compiled routing. Handler conversion uses H3's `toEventHandler`, and lazy handlers use dynamic imports. Adding a framework instance leaves this outer dispatch in place. — [App generation](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/build/virtual/app.ts); [Routing generation](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/build/virtual/routing.ts)
- Hono's entry point accepts `request`, optional environment bindings, and optional execution context. A direct Nitro mount documents the Web fetch contract; it does not promise automatic population of Hono Node-adapter bindings such as `c.env.incoming/outgoing`, or framework-specific runtime context. — [Hono API](https://hono.dev/docs/api/hono); [Hono Node adapter](https://hono.dev/docs/getting-started/nodejs); [Nitro server entry](https://nitro.build/docs/server-entry)
- Elysia 1.4.30 source selects `BunAdapter` when Bun exists and `WebStandardAdapter` otherwise, and exposes a Request-to-Response `fetch`. Its standalone Node guide uses `@elysia/node` plus `.listen()`, while Nitro's example uses `.compile()` and lets Nitro own the listener. Do not add `.listen()` to a Nitro-mounted app. — [Elysia 1.4.30 source](https://github.com/elysiajs/elysia/blob/1.4.30/src/index.ts); [Standalone Node integration](https://elysiajs.com/integrations/node); [Nitro example](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/examples/elysia/server.ts)
- Elysia's Nuxt/community integration page says Bun is required for that integration, but its Node guide and mount guide describe broader runtime support. That page is not evidence that all Nitro/Elysia HTTP integration requires Bun. Fetch interoperability also does not prove interoperability of native WebSocket upgrades or Bun-specific plugins. — [Nuxt integration](https://elysiajs.com/integrations/nuxt); [Node integration](https://elysiajs.com/integrations/node); [Mount](https://elysiajs.com/patterns/mount); [Nitro Bun runtime](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/presets/bun/runtime/bun.ts)
- Nitro provides a first-party tRPC example mounting `@trpc/server/adapters/fetch` at `/trpc/**`, without Hono or Elysia. This establishes that another HTTP router is not necessary merely to host tRPC. — [Vite + tRPC example](https://nitro.build/examples/vite-trpc)
- Returning nothing from a Nitro server entry continues to the renderer; a returned response ends processing. A nested framework's own 404 response therefore does not mean “continue to the frontend renderer.” — [Server entry](https://nitro.build/docs/server-entry); [Hono notFound](https://hono.dev/docs/api/hono)

### Inferences

- For this RAM-first experiment, make native Nitro plus existing API adapters the baseline. A second router is worthwhile only if its independently demonstrated DX/ecosystem benefit outweighs duplicated routing, context mapping, schema generation, and error handling. No evidence here establishes a memory or speed win from adding one. — [Nitro routing](https://nitro.build/docs/routing); [App generator](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/build/virtual/app.ts); [tRPC example](https://nitro.build/examples/vite-trpc)
- Partition ownership by route prefix if a second router is selected; do not let its catch-all swallow the frontend fallback. Keep global security at the outer layer or explicitly prove coverage for every path. — [Server-entry precedence](https://nitro.build/docs/server-entry)

### Gaps

- No end-to-end check of Elysia plugins, Hono bindings, tRPC subscriptions, sessions, streaming, cancellation, uploads, or existing Homarr authorization was conducted. HTTP fetch compatibility does not settle these questions.

## What do Node/Bun presets provide for a small container?

### Takeaway

`node_server` is the default standalone production target; `bun` is an explicit optimized Bun target. Both can host the frontend assets and backend in one server output, but neither choice establishes the final container size or application RAM. — [Node preset](https://nitro.build/deploy/runtimes/node); [Bun preset](https://nitro.build/deploy/runtimes/bun)

### Cited Findings

- Node output starts with `node .output/server/index.mjs`; Bun output starts with `bun run ./.output/server/index.mjs`. Docs say default Node output also runs in Bun, but the Bun preset enables Bun-specific optimizations. — [Node](https://nitro.build/deploy/runtimes/node); [Bun](https://nitro.build/deploy/runtimes/bun)
- Tagged Node and Bun runtimes use `srvx/node` and `srvx/bun` respectively, hand requests to `nitroApp.fetch`, and wire graceful shutdown. They include conditional CrossWS handling and scheduled-task startup. — [Node beta runtime](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/presets/node/runtime/node-server.ts); [Bun beta runtime](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/presets/bun/runtime/bun.ts)
- `node_cluster` starts multiple workers; the documented default is available CPU cores. `node_middleware` exports a lower-level handler for an externally owned server. They are different deployment choices, not interchangeable names for `node_server`. — [Node presets](https://nitro.build/deploy/runtimes/node)
- Current docs list `NITRO_UNIX_SOCKET`, but both inspected beta runtime files comment socket support out as TODO. Current server-entry docs also describe passing plain-object listener options to srvx, while the beta runtime directly constructs its own options. These features require version-specific verification before relying on them. — [Node docs](https://nitro.build/deploy/runtimes/node); [Server options](https://nitro.build/docs/server-entry); [Beta Node runtime](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/presets/node/runtime/node-server.ts); [Beta Bun runtime](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/presets/bun/runtime/bun.ts)

### Inferences

- Use a single non-cluster server as the low-RAM baseline, without implying that it is already sufficient for Homarr's workload. Optional process/container separation should remain a deployment choice rather than forcing separate services. Existing task/WebSocket semantics still require validation. — [Node presets](https://nitro.build/deploy/runtimes/node); [Vite output](https://nitro.build/docs/vite)

### Gaps

- Native database/image dependencies, base images, external services, process supervision, and platform/architecture support were not tested. No minimum memory, image-size, or startup-speed budget is established.

## How do OpenAPI, assets, and prerendering work?

### Takeaway

Nitro offers experimental metadata-based OpenAPI, built output assets, and build-time prerendering. None should turn editable boards, uploads, or existing API contracts into build-time snapshots. — [OpenAPI](https://nitro.build/docs/openapi); [Assets](https://nitro.build/docs/assets); [Prerendering](https://nitro.build/docs/prerendering)

### Cited Findings

- Enable `experimental.openAPI`; Nitro scans route metadata supplied by the `defineRouteMeta` build macro and produces OpenAPI 3.1.0. Default dev endpoints are `/_openapi.json`, `/_scalar`, and `/_swagger`. Production is disabled unless configured as `runtime` or `prerender`; production access controls are explicitly recommended. — [OpenAPI](https://nitro.build/docs/openapi)
- Beta OpenAPI source iterates Nitro's generated `handlersMeta`. It does not inspect nested Hono/Elysia route registries or infer full business schemas from arbitrary handler implementations. A catch-all mount is not automatic documentation of every nested endpoint. — [Beta OpenAPI generator](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/runtime/internal/routes/openapi.ts)
- Elysia separately supplies `@elysia/openapi`, with Scalar at `/openapi` and JSON at `/openapi/json`. Those are Elysia-owned docs, not an automatically merged Nitro specification; the page's old Swagger wording in metadata should not override its current package/install instructions. — [Elysia OpenAPI](https://elysiajs.com/plugins/openapi)
- Public assets copy to `.output/public` with a build-generated manifest, ETag, and Last-Modified metadata. Configurable asset directories and precompression are supported. Server assets are bundled for programmatic storage access; current docs recommend them over inlining large files. — [Assets](https://nitro.build/docs/assets)
- Current asset docs use `nitro/kv`, but the released beta exports `nitro/storage` and does not export `nitro/kv`. Main adds the KV export; the migration guide describes deprecated storage aliases. Do not copy current KV imports into the beta without checking the chosen artifact. — [Assets](https://nitro.build/docs/assets); [Beta exports](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/package.json); [Pinned main exports](https://github.com/nitrojs/nitro/blob/cef5305050325a36601ff118b9651d43a0f9ba58/package.json); [Migration](https://nitro.build/docs/migration)
- Prerendering fetches configured routes at build time and writes static responses to `.output/public`. Exact route rules, explicit routes, link crawling, and prerender hooks can select paths. Wildcard rules do not enumerate unknown dynamic paths. Current docs explicitly say configured `retry` and `retryDelay` are not applied by the current v3 prerenderer yet. — [Prerendering](https://nitro.build/docs/prerendering)

### Inferences

- Preserve the current API/OpenAPI/MCP security and schema source rather than replacing it with handwritten Nitro metadata. If nested routers are adopted, choose one authoritative schema-generation path or an explicit merge process. — [Nitro OpenAPI generator](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/runtime/internal/routes/openapi.ts); [Elysia OpenAPI](https://elysiajs.com/plugins/openapi)
- Built assets suit application code and a static frontend shell. Runtime uploads and mutable boards need runtime persistence/serving, not public-asset manifests or prerender snapshots. Prerendering public invariant pages can coexist with a dynamic server; full static hosting is not the proposed Homarr architecture, and GitHub Pages is outside the assignment. — [Assets](https://nitro.build/docs/assets); [Prerendering](https://nitro.build/docs/prerendering)

### Gaps

- No evidence that Nitro automatically preserves Homarr's generated OpenAPI, MCP tools, board permissions, upload semantics, or image proxy. Their compatibility remains application work, not a documented Nitro feature.

## How do plugins/modules work, and which features are experimental?

### Takeaway

Runtime plugins extend a running server; modules extend initialization/build behavior. Nitro 3 is beta overall, and selected capabilities have additional explicit experimental flags; the labels must not be flattened into “everything stable” or “everything experimental.” — [Plugins](https://nitro.build/docs/plugins); [Modules](https://nitro.build/docs/modules); [v3 beta announcement](https://nitro.build/blog/v3-beta)

### Cited Findings

- Runtime `definePlugin` plugins run once during startup, receive `nitroApp`, and register request/response/error/close hooks. Current docs require synchronous plugin functions, while registered hooks can be async. Beta generated startup code calls `plugin(app)` without awaiting its result, corroborating that async initialization cannot simply be put in an async plugin and assumed to block readiness. — [Plugins](https://nitro.build/docs/plugins); [Beta plugin initialization](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/build/virtual/app.ts)
- Modules run during Nitro initialization in dev/build/prerendering, can have async setup, and can modify options, add handlers/virtual modules, or register build hooks. Module code is not itself bundled, but handlers/plugins it adds are. The docs support module paths/packages, object/function forms, scanning, and Vite plugins carrying a `nitro` key. — [Modules](https://nitro.build/docs/modules)
- Explicitly experimental in current docs/types: OpenAPI and route metadata; database; tasks; async context; TypeScript bundler-resolution flag; runtime env expansion; and Vite flags/services under `experimental.vite`. Not all are required for ordinary HTTP routing. — [OpenAPI](https://nitro.build/docs/openapi); [Routing metadata](https://nitro.build/docs/routing); [Tasks](https://nitro.build/docs/tasks); [Vite experimental options](https://nitro.build/docs/vite); [Beta config types](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/types/config.ts)
- WebSocket configuration on this v3 line is `features.websocket: true`; beta types mark `experimental.websocket` deprecated in favor of that field. Older v2-era experimental WebSocket wording should not be blindly applied to current v3. This change does not prove complete Homarr subscription compatibility. — [WebSocket guide](https://nitro.build/docs/websocket); [Beta config types](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/types/config.ts)
- Tasks remain experimental. Current docs describe scheduling on Node/Bun through Croner and per-server-instance in-flight deduplication by task name, with concurrent callers sharing the first payload's result. This is not a distributed job lock or evidence of equivalence with an existing queue/scheduler. — [Tasks](https://nitro.build/docs/tasks)

### Inferences

- Keep existing DB, scheduling, and storage abstractions where possible. Nitro's deployment layer does not require replacing those with experimental built-ins. Use a module for build registration and plugins/hooks for runtime resources/shutdown; define a separate explicit readiness strategy if async initialization must finish before requests. — [Modules](https://nitro.build/docs/modules); [Plugins](https://nitro.build/docs/plugins)

### Gaps

- No package-level test of all module forms or initialization behavior was run. Documentation and Context7 may mix main/nightly APIs with the older beta; release-tag source must arbitrate future implementation details.

## What can the evidence say about memory without benchmarking?

### Takeaway

The evidence explains plausible footprint-saving mechanisms, not Homarr RAM savings. No defensible numerical RAM estimate, performance ranking, or container budget follows from framework size, dependency counts, or hello-world benchmarks. — [Nitro routing](https://nitro.build/docs/routing); [Nitro beta announcement](https://nitro.build/blog/v3-beta); [Node memory definitions](https://nodejs.org/api/process.html#processmemoryusage)

### Cited Findings

- Nitro compiles route matching, splits handlers into lazy chunks, and conditionally emits feature/hook code. That is inspectable build/runtime structure. It does not guarantee that eagerly imported application services, schedulers, or router instances disappear. — [Routing](https://nitro.build/docs/routing); [Beta routing generator](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/build/virtual/routing.ts); [Beta app generator](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/build/virtual/app.ts)
- The v3 announcement claims a minimal `standard` preset bundle below 10 kB and fewer dependencies. This is a first-party minimal-bundle claim, not a measured Homarr server, Docker image, Node/Bun baseline RSS, or loaded-workload memory result. Dependency packaging has also changed between the beta tag and main. — [Announcement](https://nitro.build/blog/v3-beta); [Beta manifest](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/package.json); [Pinned main manifest](https://github.com/nitrojs/nitro/blob/cef5305050325a36601ff118b9651d43a0f9ba58/package.json)
- Node defines RSS as resident process memory including code and native/JavaScript objects; V8 heap fields are only part of memory, with external and ArrayBuffer allocations reported separately. Its docs also warn that allocator fragmentation can grow RSS despite stable heap totals. Bundle bytes and heap alone therefore cannot establish process RAM. — [Node memoryUsage](https://nodejs.org/api/process.html#processmemoryusage)

### Inferences

- A simpler production process layout, fewer eager imports, code splitting, and omitting unused features are sensible hypotheses to evaluate later. None establishes “Nitro beats Next,” “Bun uses less RAM,” or “Hono beats H3/Elysia” for this application. — [Nitro generated runtime](https://github.com/nitrojs/nitro/blob/v3.0.260903-beta/src/build/virtual/app.ts); [Node memory definitions](https://nodejs.org/api/process.html#processmemoryusage)
- If authorized later, compare feature-equivalent production builds on the same deployment platform/data, with cold/idle, representative board loads, integration jobs, WebSockets, uploads, and sustained workloads. Measure total container memory as well as process RSS/heap, and production image size separately from build-tool dependencies. This is a proposed evaluation method, not work performed or a numerical budget. — [Node memory definitions](https://nodejs.org/api/process.html#processmemoryusage); [Nitro production output](https://nitro.build/deploy/runtimes/node)

### Gaps

- No benchmark, build-size inspection, install resolution, production image, or capability-preservation test exists from this research. The main blockers are beta/docs drift and unverified application compatibility, not lack of a documented fetch adapter. RAM and footprint targets remain unsettled by the assignment.
