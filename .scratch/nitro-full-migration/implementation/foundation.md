# #01 public foundation candidate r2 handoff

2026-10-10. COMPOSITION delivery for coordinator re-review, not ticket acceptance or full-product completion. Bounded acceptance remains on hold pending re-review of the lifecycle corrections below. Q11–15 are approved; DESIGN/EXECUTION remain coordinator-owned authority. Q16/production authentication engine remains unresolved. No other owner's source or feature was mounted or edited. Only the explicitly approved UI navigation export and Query dependency were declared in its manifest.

## P2 lifecycle corrections and red/green evidence

Reviewer `ses_ed8e74a03ffeq5fG56QjWknEfm` raised three genuine P2 findings; each received a focused failing regression before its implementation fix.

1. **Cancellation ordering:** `src/server/application.ts` now uses one terminal promise for retained-body abort, consumer cancellation, read failure and EOF. Cancellation must settle before reader release, request disposal and contribution disposal. HEAD awaits source cancellation as well. The new `shutdown waits` Fetch regression initially observed request/contribution disposal while deferred cancellation was pending; it now passes. Additional HEAD/consumer probes keep cancellation pending across shutdown, then reject it: failure remains reported/returned, cancellation executes once, and cleanup follows settlement.
2. **Discarded response ownership:** `respond` takes ownership before checking abort/finalizing. Error exits await cancellation of the owned body before request disposal, including handler-return abort, renderer-return abort and invalid response effects. `src/server/render.tsx` no longer throws after constructing its response; the application receives and owns that response before checking abort. All three discarded-response probes initially failed with `Response completed without source cancellation`; all now pass with deferred source cancellation preceding disposal.
3. **Shutdown initiation:** `server/lifecycle.ts` registers Bun standalone SIGINT/SIGTERM initiation handlers before srvx's signal callbacks. They synchronously initiate the same idempotent application disposal later awaited by Nitro's existing close hook. The close hook removes only the owned handlers, including on failure. `src/server/host.ts` caches disposal and refuses host recreation after shutdown begins. Production `server/plugins/lifecycle.ts` still uses the same singleton host; the narrow registration function is shared with an isolated test fixture, not a second production host.

Pinned source checked: Nitro `3.0.260903-beta` `dist/runtime/internal/shutdown.mjs:3–6` runs close hooks only after `server.close`; `dist/presets/bun/runtime/bun.mjs:27–38` constructs srvx then wraps close. srvx `1.0.5` `dist/adapters/bun.mjs:86–87` awaits `Bun.stop`, and `dist/_chunks/_plugins.mjs:24–55` supplies SIGINT/SIGTERM draining/force timeout. `nitro/types` declares only request/response/error/close hooks—there is no public shutdown-initiation event to invent.

The fallback is deliberately limited to built standalone Bun, excluding dev and srvx's default CI/TEST-disabled signal modes. It neither calls `process.exit` nor changes other listeners. Programmatic listener close without SIGINT/SIGTERM and other deployment presets do not gain a pre-drain guarantee from this fallback; their platform integration needs separate review.

`tests/public-shutdown.ts` builds the actual pinned Nitro Bun preset into an owned temporary directory, starts one disposable loopback/ephemeral listener with an explicit clean environment, opens a never-ending public response, then signals its own child. Before the fix it hit the four-second failure deadline ahead of the configured eight-second srvx force timeout. After the fix both SIGTERM and SIGINT pass in about 1002ms, without force-close output. The fixture observes exact order: request abort → listener drain initiation → asynchronous source cancel start/settlement → request disposal → contribution disposal → owned signal-handler removal. It checks preservation of pre-existing handlers. Fixture resources are killed/closed if necessary and the exact owned temporary directory is removed; no fixture is registered in production.

Candidate request/contribution/body-lifecycle semantics and Bun signal integration are **r2**, pending review. Principal/setup, public bootstrap, provider order and refresh/generation type shapes are unchanged r1; coordinator records their independent narrow acceptance. UI navigation source shape is accepted **unmounted v1** per reviewer `ses_ed8e606d5ffeklGKAMsD3aK9eT`: only `packages/ui/package.json` `./navigation` and `@tanstack/react-query: catalog:` plus its one lock workspace dependency line were added, without UI/form source inspection, edits or mounting.

### Current r2 validation

- Scoped Fetch regression: **10 pass, 0 fail, 136 assertions**, retaining the original four cases and adding six focused cancellation/discard cases.
- Real listener regression: `NITRO_TEST_TMPDIR=<approved disposable parent> bun --no-env-file tests/public-shutdown.ts SIGTERM` and `SIGINT` passed. The pinned rolldown fixture build reports a non-fatal missing debug-name warning; no force timeout was used to obtain success.
- Scoped app lint/typecheck and format check of **38 handwritten files** passed; generated route tree retains generator formatting.
- Root Nitro-only build and built production browser regression passed. Final build/start/Fetch/browser checks use `env -i PATH="$PATH"` plus explicit test configuration; `.env` loading remains disabled at every layer.
- Frozen install passed with no changes after the approved UI manifest/lock addition. Lock delta against the pre-install snapshot: **108 added lines, zero deleted lines**; only the approved UI dependency changes a pre-existing workspace.
- Current final built server: **PID 89683**, listening only at **127.0.0.1:3200**, background shell `sh_12729f54b001ax3oVoBbKHg4gh`. Prior owned PID 3920 and interim PID 85384 were gracefully stopped. Final build output is `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-foundation-revision-build.log`. The latest source, including the CI/TEST signal-mode guard, passed build, scoped lint/typecheck, production browser regression and both real-listener signal probes. The runtime is left available for coordinator inspection; 3100 and person browser/data remain untouched.

## Runnable result

- Root build/dev/start select only `@homarr/nitro`. Both dev and built Bun delivery were exercised at `127.0.0.1:3200`.
- Public cold SSR, hydration, reload, client navigation, typed params/search, nested not-found and management denial pass the focused browser regression. `/management` returns a 302 to `/manage`; cold `/manage` returns 401. Unmatched API namespaces return JSON 404, not HTML fallback.
- Every SSR document allocates its own Router and QueryClient. Request principal/setup, memoization, abort signal, effects and cleanup live in the request context. Bootstrap is a parsed/frozen public allowlist, escaped for its JSON script; only explicitly public successful queries may dehydrate.
- Production remains anonymous/setup-unavailable, uncached and disconnected from persistence, sessions and providers. The health endpoint reports only `public-foundation`, not product readiness.
- Explicit provider order has Mantine theme/direction and Query installed; settings/session/locale/Jotai/modals/notifications/Spotlight/Assistant remain absent contribution slots. Absence is not feature preservation.
- One host is shared by SSR and Nitro shutdown. The built `_ssr/ssr.mjs` imports `fetchApplication` from `../index.mjs`; it does not construct a second host. Request resources survive until response body consumption/cancellation. Application shutdown aborts owned requests, drains them, then disposes contributions in reverse order.

## Candidate contracts and consumers

Type shapes below remain **r1**; request/contribution/body lifecycle and Bun signal behavior have the candidate **r2** correction above. Coordinator records acceptance separately. Only the foundation consumes these app contracts. Feature packages retain their own framework-independent contracts; COMPOSITION adapts reviewed exports rather than making those packages import app internals.

| Candidate source under `apps/nitro/src/` | Boundary                                                                                                                                                                                                                                                         | Intended consumer / ownership                                                                                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contracts/request.ts`                   | Discriminated Principal/SetupState; public/protected AccessRequirement; default-deny AccessDecision; request ID/signal, memoization, cookie/header effects and body-lifetime disposal. Injected RequestServices resolves identity/setup/policy.                  | #04 policy and #09 session supply authority; #120–124 Fetch adapters consume request context. COMPOSITION owns adapter/assembly.                                                       |
| `contracts/contribution.ts`              | Application ready/fetch/dispose; unique RuntimeContribution IDs, ordered readiness/reverse disposal; FetchContribution matching, access gate and pass/response outcomes. Stable phase order: auth, rpc, api, stream, binary, asset, then SSR.                    | #120–124 transports and lifecycle resource owners provide local descriptors/handles; COMPOSITION alone registers them. Nitro handles generated static assets outside the SSR fallback. |
| `contracts/render.ts`                    | Snapshot version 1: request ID, locale, theme, direction, session/setup kind and render revision; separately typed assets. PublicRenderSettings is an explicit injected value, not a selection policy.                                                           | #05–07 later supply reviewed locale/direction/settings/clock behavior; #21/#125 packaging supplies assets. Private SSR requires a separate reviewed extension.                         |
| `contracts/providers.ts`                 | Ordered settings → session → locale → theme → direction → query → jotai → modals → notifications → spotlight → assistant; one typed optional component per non-builtin slot.                                                                                     | Frontend/package feature owners supply reviewed providers; COMPOSITION installs identical server/client contributions. Current client and server contributions are both empty.         |
| `contracts/refresh.ts`, `app/effects.ts` | Query refresh, loader refresh, render revision, session change and epoch-bound resource-policy change are different effects and ports. Identity/policy transitions cancel and clear Query state before authority/loaders refresh.                                | Later auth/policy/client transport contributions provide real ports; no event transport or real identity recovery is connected yet.                                                    |
| `app/session-transition.ts`              | QueryClient-scoped generation/masking port, preserving `runSessionTransition`, `captureSessionTransition`, `isSessionTransitionCurrent` and conditional `invalidateSessionTransition`. Failed transitions remain blocked; overlapping managed operations reject. | Later identity-bound UI and mutation owners consume these symbols through reviewed composition. Merely exposing the hook does not prove all private views are masked.                  |

The approved `@homarr/ui/navigation` export is declared but unmounted. No subsystem contribution is consumed by the foundation. Independently ready source-preserving work may proceed without whole-peer completion, but actual mounting waits for corrected #01 acceptance and individual interface review.

## Initial r1 validation evidence (historical)

Commands below ran with Bun automatic environment-file loading disabled. App scripts also carry `--no-env-file`; Vite has `envDir: false`, and Nitro is explicitly initialized with `{ dotenv: false }`.

| Command / scope                                                                                       | Result                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun --no-env-file run dev` at root, then `bun --no-env-file tests/public-browser.ts` in `apps/nitro` | Fresh dev process passed two isolated browser contexts, distinct SSR IDs/search states, same-document client search navigation, non-nested/nested layout transitions, denial, reload and nested 404 hydration. Browser owned and closed by the regression.                                                                                           |
| `bun --no-env-file run build` at root                                                                 | Passed; only new Nitro SSR/client/Nitro environments built.                                                                                                                                                                                                                                                                                          |
| `bun --no-env-file run start` at root, then the same scoped browser command                           | Passed against built Bun delivery, with no captured hydration mismatch or page error.                                                                                                                                                                                                                                                                |
| `bun --no-env-file test tests/public-fetch.test.ts` in `apps/nitro`                                   | 4 pass, 0 fail, 117 assertions. Forged credentials denied before protected handlers; HTTP redirect/404/401/500/HEAD outcomes; eight concurrent safe snapshots with isolated memoization and test-injected locale/theme/direction; multiple Set-Cookie effects and body-lifetime disposal. Test-injected settings are not a production locale policy. |
| `bun --no-env-file run lint` and `bun --no-env-file run typecheck` in `apps/nitro`                    | Passed, scoped to the new app.                                                                                                                                                                                                                                                                                                                       |
| Scoped `oxfmt --check` on 33 handwritten app/config/test files                                        | Passed after formatting only the owned Vite config and Fetch test. Generator-owned `src/route-tree.gen.ts` uses the pinned generator's formatting and is excluded from this format result.                                                                                                                                                           |
| `bun --no-env-file install --frozen-lockfile --ignore-scripts` at root                                | Passed: 2336 installs across 2321 packages, no changes.                                                                                                                                                                                                                                                                                              |
| `git diff --check -- package.json bun.lock apps/nitro`                                                | Passed for tracked owned changes.                                                                                                                                                                                                                                                                                                                    |
| `curl --include http://127.0.0.1:3200/api/health`                                                     | 200 JSON `public-foundation`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`.                                                                                                                                                                                                                                                          |
| `lsof -nP -iTCP:3200 -sTCP:LISTEN`                                                                    | Built server PID 3920, listener `127.0.0.1:3200`; left running for coordinator inspection. Background shell `sh_1271494a10010RWFdya0mlvtYc`.                                                                                                                                                                                                         |

Stopped only owned dev listeners (97233, then 1971). Earlier owned production listener 90157 and dev listener 95351 had already been stopped. Existing 3100 experiment/image/data and existing browser sessions were untouched.

### Toolchain findings

- Retained Nitro `3.0.260903-beta`, Router `1.168.8`, oRPC `2.0.0-beta.43`, React `19.2.7`, Mantine `9.6.0`, Vite `8.1.4`. Declared router-plugin `1.167.7`: verified npm peers permit Router `^1.168.5`; plugin `1.168.8` requires a newer Router. No implicit Router upgrade.
- Context7 was reported quota-exhausted. Verification used pinned installed declarations/source plus current primary docs/npm peer metadata. In this Nitro beta, Vite's dotenv switch alone is insufficient: the verified `_nitro` option receives a preinitialized dotenv-disabled instance.
- Dev hydration requires `@vitejs/plugin-react/preamble`. The readiness marker now runs after React commits rather than mutating `<html>` before hydration; both dev and production regressions pass.
- One config hot restart produced `cssModulesCache.get(config).get` failure; a fresh owned process resolved it. The first resumed browser run also saw a changed document request ID after HMR edits; the fresh-process navigation regression passed. Seam acceptance is based on fresh dev and built production, not guaranteed hot-restart robustness.
- The generated route tree uses tool-authored comments/type assertions. Handwritten application code uses the repository's no-comment convention.
- Existing package roots were not reusable for this bounded shell: inspected common/UI roots transitively require Next/environment-aware facilities. No legacy global-initializing DB/env entrypoint was imported.

## Exact owned source changes

Root `package.json`: only build/dev/start changed. `packages/ui/package.json`: only the approved navigation export and Query dependency added. `bun.lock`: new app/workspace/dependency additions below plus the approved UI workspace dependency. This handoff is the only written planning/evidence file; DESIGN, EXECUTION, ROSTER and issue criteria remain untouched.

New app files (39, including generated route tree and isolated shutdown fixture):

```text
apps/nitro/nitro.config.ts
apps/nitro/package.json
apps/nitro/server/lifecycle.ts
apps/nitro/server/plugins/lifecycle.ts
apps/nitro/src/app/bootstrap.tsx
apps/nitro/src/app/effects.ts
apps/nitro/src/app/providers.tsx
apps/nitro/src/app/router.tsx
apps/nitro/src/app/session-transition.ts
apps/nitro/src/contracts/contribution.ts
apps/nitro/src/contracts/providers.ts
apps/nitro/src/contracts/refresh.ts
apps/nitro/src/contracts/render.ts
apps/nitro/src/contracts/request.ts
apps/nitro/src/entry-client.tsx
apps/nitro/src/entry-server.tsx
apps/nitro/src/route-tree.gen.ts
apps/nitro/src/routes/(public)/_public/about/runtime.$section.tsx
apps/nitro/src/routes/(public)/_public/about.index.tsx
apps/nitro/src/routes/(public)/_public/about.route.tsx
apps/nitro/src/routes/(public)/_public/about_.status.tsx
apps/nitro/src/routes/(public)/_public/index.tsx
apps/nitro/src/routes/(public)/_public/manage.route.tsx
apps/nitro/src/routes/(public)/_public/management.route.tsx
apps/nitro/src/routes/(public)/_public.route.tsx
apps/nitro/src/routes/-components/recovery.tsx
apps/nitro/src/routes/__root.tsx
apps/nitro/src/server/application.ts
apps/nitro/src/server/compose.ts
apps/nitro/src/server/host.ts
apps/nitro/src/server/render.tsx
apps/nitro/tests/public-browser.ts
apps/nitro/tests/public-fetch.test.ts
apps/nitro/tests/public-shutdown.ts
apps/nitro/tests/fixtures/shutdown/entry.ts
apps/nitro/tests/fixtures/shutdown/host.ts
apps/nitro/tests/fixtures/shutdown/plugin.ts
apps/nitro/tsconfig.json
apps/nitro/vite.config.ts
```

Generated `.output`, `.nitro`, dependency installation and Vite artifacts are not source handoff files. No staging or commits performed.

## Baseline-preserving lock ownership

Exact pre-install snapshot:
`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-foundation-baseline.lock`.

`git diff --no-index <snapshot> bun.lock` isolates this owner's lock hunks from the already-modified baseline: **108 insertions, zero deletions**. Only the expressly approved `workspaces:packages/ui` Query dependency changes pre-existing metadata; removing that one added field produces the exact baseline UI workspace. All other pre-existing entries remain unchanged, with sole added workspace `apps/nitro` and the following same 39 added package keys. Frozen install passed without changes. Preserve separate baseline lock changes when staging later.

```text
@babel/helper-plugin-utils
@babel/plugin-syntax-jsx
@babel/plugin-syntax-typescript
@homarr/nitro
@tanstack/router-generator
@tanstack/router-plugin
@tanstack/router-utils
@tanstack/virtual-file-routes
ansis
anymatch
ast-types
babel-dead-code-elimination
binary-extensions
diff
esprima
glob-parent
is-binary-path
prettier
recast
unplugin
webpack-virtual-modules
@homarr/nitro/zod
@tanstack/router-generator/@tanstack/router-core
@tanstack/router-generator/zod
@tanstack/router-plugin/@babel/types
@tanstack/router-plugin/@tanstack/router-core
@tanstack/router-plugin/chokidar
@tanstack/router-plugin/zod
@tanstack/router-utils/@babel/parser
@tanstack/router-utils/@babel/types
anymatch/picomatch
babel-dead-code-elimination/@babel/parser
babel-dead-code-elimination/@babel/types
recast/source-map
unplugin/picomatch
@tanstack/router-generator/@tanstack/router-core/cookie-es
@tanstack/router-plugin/@tanstack/router-core/cookie-es
@tanstack/router-plugin/chokidar/readdirp
@tanstack/router-plugin/chokidar/readdirp/picomatch
```

Initial install attempts were blocked by configured release age 604800 for the approved pins; the authorized exact-pin install used `--minimum-release-age=0 --ignore-scripts`. Installer rehoisting was reconciled against the snapshot so existing Router-core/rou3 entries stayed unchanged; new generator/plugin resolutions use nested added keys. Subsequent frozen install validates the resulting lock without rewriting it.

## Acceptance and remaining work

The coordinator can re-review the three P2 corrections and candidate r2 lifecycle semantics before lifting the bounded #01 acceptance hold. Descriptive generated root/index/group/pathless/layout/dynamic/non-nested/helper semantics compile and are exercised where applicable by browser navigation. Pending/error recovery components exist at root and nested layouts; forced pending timing and generic loader-error retry were not browser-probed. Fetch-level failures have a tested safe 500 outcome.

Real session authority, permission grants, dynamic locale/settings selection, all product providers, policy-bound private Query/loader recovery, populated/private/cached SSR, persistence/jobs/transports and full Docker packaging remain uninstalled and unverified. Provider install-once/order and transition interfaces are candidate source contracts, not proof of real product integration.

Whole Homarr/backend/tRPC 1:1 preservation and genuine current SQLite backup restore remain mandatory later integrated gates. This shell establishes neither those results nor an Auth.js/JWT production approval. No whole-peer completion barrier is added: accepted local interfaces can be composed incrementally after coordinator review.
