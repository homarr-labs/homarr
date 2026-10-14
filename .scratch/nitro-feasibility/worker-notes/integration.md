# AJN-506 integration

## PLAYABLE CHECKPOINT — ownership relinquished

User speed/human-in-loop steering pauses exhaustive final validation, not cancels it. **Server stays up safely; modification/build/listener/browser ownership is relinquished to the coordinator after this handoff.** Do not interpret this checkpoint as AJN-506 acceptance completion or ticket closure. No other agents were spawned.

- Public dashboard: **http://127.0.0.1:3100/boards/public**. API reference: **http://127.0.0.1:3100/api-docs**.
- Select **Fixture owner → Select identity** for private board, inline editor and Synthetic source controls. Fixture viewer/anonymous have public reads only. Browser-specific fixture login is required; no credentials or existing Homarr data are involved.
- Running healthy container `homarr-nitro-fixture-fixture-1`, image `homarr-nitro-fixture:local`, image ID `sha256:2b2070a2893c9054939476584cc6d0c84ef66dd426b848599c1b85bfc2503d7b`.
- Dedicated volume `homarr-nitro-fixture_fixture-data` mounted only at `/app/.fixture-data`; database `/app/.fixture-data/fixture.sqlite`. Preserve this volume. Internal `0.0.0.0:3100`, published only `127.0.0.1:3100`; configured origin matches.
- To stop just this fixture: `docker compose --env-file /dev/null -f apps/nitro-experiment/compose.yaml stop fixture`. Do not remove its volume. No other container/process/data was stopped or reused.
- Current durable public board: revision **5**, label **Preserved conflict draft**, **3 columns**, widget display label **Verified inventory**. Source restored to healthy **73 items** for human testing. These are intentional synthetic observations, not default seed resets.

## Snapshot identity

- Built identity **`674cf506-623c-4b6d-9c88-2a725e80b909`**, unchanged through actual HTTP/browser saves. Nitro `3.0.260903-beta`, Bun `1.4.2`, Linux **arm64**, target `linux/arm64`; approved `nitro/database` → db0 Bun SQLite connector.
- Input SHA256 `8f15f374a6052f23300250d6d3879d19787c4d57eb7683bc0fd97486eca9b183`; output inventory SHA256 `c993123bbb9835cf07c86ed842b22ac975461bfb0c74211dba0bb7ca18800b94`.
- `bun.lock` SHA256 `3e420169824100ccb4a930f829f8832cead8932fa2c138973ae5cc3b8f6bb210`, 686062 bytes. Git HEAD `66e2199f9cd1e4026249c3763413988bab8664c4` is context only: the source is **uncommitted allowlisted staged bytes**, not that commit's contents. Full file hashes, pinned base, literal import/package inventory and runtime metadata: `results/container-provenance.json`. The app lint config is not a build input of the existing allowlist; it was checked locally, not claimed baked into provenance.

## Mechanical integration changes

Paths relative to `apps/nitro-experiment/`:

- `package.json`, `tsconfig.json`: scoped checks include `scripts/container`; no dependency/lock/root manifest changes.
- `.oxlintrc.json`: inherits root lint policy, disables only `import/default` for `src/entry-server.tsx`. Installed Nitro declares the `?assets=client` virtual default export; the static import resolver incorrectly checked the underlying entry module. Other lint warnings remain visible.
- `nitro.config.ts`: satisfies released mandatory `database.default` typing with an unused lazy in-memory Bun SQLite connection. Actual repository still uses named `fixture` with its dedicated durable path; no new application connection is opened.
- `src/app/router.tsx`: JSON-normalizes Query dehydration before Router's serializable boundary; uses typed Link wrapping the same Mantine Anchor appearance in recovery. Runner, epoch/witness, revision and fail-closed recovery semantics preserved.
- `src/features/viewer/board-viewer.tsx`: same typed Link/Anchor composition for existing navigation; no redesign.
- `src/server/rest/router.ts`: narrows referenced media types before setting examples; runtime contract unchanged.
- `src/server/render/handler.ts`: projects Nitro's asset object into declared `entry/css/js` fields before strict parsing. Nitro's non-DTO `merge` method was causing populated pages to return 500.
- `scripts/container/healthcheck.ts`: actual repository-backed **GET `/api/boards/public`** readiness with direct sanitized projection validation. The prior GET `/rpc/board/read` returned 404 because the released RPC contract defaults to POST.
- `src/features/viewer/document-state.tsx`: validates actual installed Router's encoded root match `__root__\0`. Previous `__root__` check prevented client startup. Installed router-core `router.ts:1487–1503` constructs route/path match IDs; `ssr/ssr-match-id.ts` encodes `/` as NUL. Observed real bootstrap confirms that boundary.
- `vite.config.ts`: SSR build explicitly names its entry and externalizes experiment server source **only in the intermediate Vite SSR service**, preserving absolute IDs (`makeAbsoluteExternalsRelative: false`). Nitro subsequently bundles those same original modules with its route/plugin graph, so SSR and APIs share one session/widget/database/cache lifecycle. Previously SSR had a separate compiled session map and denied actual owner cookies. Installed Nitro `dist/vite.mjs:457–483` requires legacy `rollupOptions.input` for explicitly supplied SSR environments; the current installed Rolldown declaration supports preserving absolute external IDs. No runtime external workspace source remains: final artifact audit passes. No second listener/store/framework was added.
- `src/server/context/http.ts` was temporarily given stack-frame-only diagnostic logging, then restored; no diagnostic logging remains. All edits use patch, no comments/any/assertion workaround/new tests were added.

Canonical ticket/spec/COORDINATION/ROSTER and all eight worker handoffs (including generation/restart addenda) were consumed. Root/source outside the app, existing notes, Linear/roster/deepwork and Git history stayed untouched. Original unrelated changes remain.

## Checks actually executed

Commands from app cwd unless specified:

1. `bun --no-env-file run lint`: first failed on virtual asset default import; rerun **exit 0 with 15 warnings** after the narrow resolver exemption/type fixes. Includes packaging scripts. `results/lint.log` is the last scoped run, **before subsequent hydration/Vite bundling fixes**.
2. `bun --no-env-file run typecheck`: first failed with seven type errors (database default, polymorphic navigation, Query serialization, OpenAPI reference narrowing); corrected reruns **exit 0**. `results/typecheck.log` likewise predates the final hydration/Vite changes. Final scoped reruns are explicitly pending, not falsely green for the latest snapshot.
3. `bun --no-env-file run build`: initial macOS app production build passed; Vite reported a >500 kB client warning. Final production container builds use Linux arm64 and supersede this artifact for runtime evidence.
4. Root: `bun --no-env-file apps/nitro-experiment/scripts/container/run.ts build`: frozen allowlisted install/build/audit succeeds for the current image. `results/container-build.log` is final successful run. No root env loading or real data input. The originally suspected nested `_libs/@orpc` relative imports resolve correctly; audit passed, no emitted-file rewriting or node_modules copy workaround.
5. Root: `docker compose --env-file /dev/null -f apps/nitro-experiment/compose.yaml up --no-build --wait --wait-timeout 90 fixture`: current image **healthy**. Owned container was stopped/recreated for source fixes; dedicated volume preserved each time. No application-data persistence across final same-image restart claim yet.
6. Temporary inline Bun real Fetch/oRPC client observation from app cwd, cookies in memory only: `bun --no-env-file -e "$(cat <approved-temp>/ajn506-http.mjs)" > ../../.scratch/nitro-feasibility/results/http.json`. This is a disposable observation command, no CI/test suite. Full safe outcomes in `results/http.json`.
7. Real Chromium CLI `agent-browser --session ajn506-sol --allowed-domains 127.0.0.1 open http://127.0.0.1:3100/boards/public`, snapshot/ref clicks/fills, safe DOM eval, screenshots. Isolated transient browser, no user profile or persisted cookies. Only this named context was used.

Initial failures, retained here rather than implied away: health GET RPC 404/unhealthy; strict assets 500; browser root-ID startup rejection; HTTP owner private HTML failure from duplicated SSR session state; first externalization attempt disabled SSR detection (404); function external option conflicted with Nitro's merged array; relative external paths then failed build resolution. Explicit SSR input, regex array and absolute-ID preservation fixed these. The final HTTP command passed after those fixes. One results redirection failed before the results directory existed; no build ran in that failed invocation.

## Proven bounded acceptance so far

- **Real mounted HTTP:** populated public HTML without executing JS; exact HTML/bootstrap cache reuse (`miss`→`hit`, same render count and bytes), bootstrap/loader/Query equality; owner private populated warm hit; anonymous/viewer/logout denial after warm private through HTML, REST, typed board/widget; sanitized projections; viewer direct save denial. Missing/foreign Origin, foreign Host and read-method mutation denied. Invalid REST inputs rejected. OpenAPI **3.1.0**, one GET `/boards/{boardId}`, `/api` base; docs/spec HEAD/no-store, POST405/Allow; static docs CSP.
- **Live HTTP widget:** healthy73, last-good stale source-error retaining observation time, timeout stale; observed timeout request **761.46 ms** against configured 750 ms upstream deadline (transport overhead included). Real source fetched on same listener.
- **Real saves:** two mounted expected-revision copies yielded exactly one saved/one CONFLICT; later HTML advanced revision under unchanged build.
- **Real browser:** populated hydration now mounts enabled session controls and anonymous status; owner selection exposes editing/source controls. Source UI healthy73/error/timeout displayed visible generation/time and last-good stale. Label/columns/widget-label saved and visibly reconciled revision3. Concurrent server save followed by stale browser save kept **Preserved conflict draft**, disabled blind save, exposed Check saved settings; latest read advanced displayed revision4 without dropping draft; explicit Keep my draft + separate Save committed revision5. See screenshots and `playable-browser.txt`.
- **Current basic playable smoke:** healthy container, populated public response200, current revision5/healthy73 (`results/playable.json`, `playable-public.html`). No unsafe public publication or auth weakening.

## Pending — resume on coordinated stable snapshot

No full acceptance pass, final performance table, or product parity/savings claim. These remain to be run and recorded:

- Final scoped lint/typecheck after final bundling/hydration edits; renewed local production build if required. Complete source-level browser graph audit beyond successful output literal/package inventory (forbidden patterns should also explicitly include Hono/Elysia/Eden, not merely observe absence).
- Fresh browser console/error collection after clearing the historical pre-fix startup error; recoverable hydration marker/first-render capture, direct owner private/reload/navigation, viewer/logout private mask/error recovery/public retry, mobile/keyboard/API-docs visual review.
- Session expiry (controlled clock versus wall time clearly labeled), eviction/revoked delayed deliveries, all mutation Origin/Host/method surfaces. Missing DB/error fixture cases remain isolated-worker evidence, not mounted final evidence.
- Recovery Retry/SessionControls both-order overlap, expiry and stale save/navigation races; unknown transport draft review. CLI routing supports abort/body but no documented delay knob; use a bounded reviewed controlled browser fetch interception if needed, never claim an unrun delay.
- Widget cold-unavailable, 60-second expiration, actual post-restart lower-generation observation accepted in an anonymous public tab kept alive. `widget-stale-unavailable.txt` currently records **stale**, not unavailable; filename is not evidence of unavailable. Other source body/redirect/saturation/cancellation/close bounds require focused observations or honest source-only labels.
- Delayed old render versus save cannot overwrite current key; cache entry/byte/age/in-flight bounds and graceful close checks. Prior worker isolated evidence is not final container runtime evidence.
- **Restart the SAME current built container/volume**, prove durable revision5 content not reseeded, cold sessions/private artifact denial/caches, clean close/start; preserve an anonymous public tab through that restart.
- Exploratory startup/readiness, cold/warm HTTP timing windows/counts, final browser asset transfer versus uncompressed sizes, cgroup memory/PID1 RSS separately, CPU sampling, image uncompressed/compressed size distinctions; raw observations/units/caveats. No numeric performance gate or whole-Homarr savings inference.

## Evidence/resources at handoff

`results/http.json`, `container-build.log`, `container-provenance.json`, `lint.log`, `typecheck.log`, `owner-edited-desktop.png`, `conflict-draft.png`, `playable.json`, `playable-public.html`, `playable-browser.txt`. `public-initial.html/.headers` belong to an earlier pre-final build and must not substitute for current snapshot evidence. No tokens/cookies are in results; HTTP cookies existed only in memory. Temporary command source is `<approved-temp>/ajn506-http.mjs` and is removed at handoff. Named browser context is closed at handoff to discard ephemeral fixture cookies. Container and volume intentionally stay available for the human/coordinator. Final read-only source/evidence review still gates closure.

## Independent read-only final baseline — 2026-10-10

**Completed this assigned follow-up without application writes or disruption.** Human testing retains the running container. No rebuild/restart/stop, source/config/DB/browser/cookie mutation, feature HTTP request, install, tests, extra listener or delegated agent. Only this append and new `results/baseline-final-*.log/json` were written. Short-lived `docker exec` metadata/counter readers exited; no collector process remains. Earlier resource handoff and stop command remain valid; the same container/image/volume/start timestamp were observed.

### Latest-source scoped checks

From `apps/nitro-experiment/`, with existing declared tooling and no root env loader:

- `bun --no-env-file run lint > ../../.scratch/nitro-feasibility/results/baseline-final-lint.log 2>&1` — **exit 0, 15 warnings**, no lint errors. Actual command: `oxlint src server scripts/container vite.config.ts nitro.config.ts`. Warnings are the existing sort/semantic-role/import/empty-export/constructor/internal-field diagnostics; no fix attempted.
- `bun --no-env-file run typecheck > ../../.scratch/nitro-feasibility/results/baseline-final-typecheck.log 2>&1` — **exit 0**, actual `tsc --noEmit -p tsconfig.json`. Includes packaging scripts and the latest hydration/Vite fixes. This supersedes only the earlier pending final scoped-check items, not other acceptance gaps.
- App manifest pins remain oxlint **1.73.0**, TypeScript **7.0.2**, Bun **1.4.2**; no dependency/config change was needed. No root/turbo/full-repository check or build was run.

### Source/image consistency and identity

Read the existing container's `/app/container-provenance.json` via `docker exec ... cat`, checked its bytes against the previously captured provenance, then hashed each current recorded input. Reconstructed the helper's existing allowlist without executing its build action: **all 68 input files match hashes and lengths**, with **no added/missing allowlisted paths**. Root staged `.dockerignore`/`Dockerfile` correctly map back to the experimental app's files. No env/data file was opened. Read-only remote Bun hashing confirms **all 36 recorded `.output` files match** the baked inventory. These results establish file consistency, not functional acceptance or a clean committed source tree.

`apps/nitro-experiment/.oxlintrc.json` was used for current local lint but remains **excluded from image build provenance**, as does its inherited root lint config. Neither is claimed baked. Build identity remains **`674cf506-623c-4b6d-9c88-2a725e80b909`**. Input/output hashes and lock hash in the earlier handoff remain valid.

Selected metadata only (no environment or credentials printed): `docker inspect homarr-nitro-fixture-fixture-1`, `docker image inspect <observed image ID>`, `docker info`, and short-lived `docker exec ... bun --no-env-file -e <read-only metadata/hash expressions>`. Container is running/healthy, UID1000, direct Bun PID1; start timestamp **2026-10-10T16:07:09.365514112Z** is unchanged. Image ID is still `sha256:2b2070a2893c9054939476584cc6d0c84ef66dd426b848599c1b85bfc2503d7b`. Docker engine **29.4.0 / Linux aarch64**, image **linux/arm64**, executing **Bun1.4.2 / Linux arm64** agree with the native platform. No alternate-platform execution was attempted.

### Exploratory existing-container sample

Six snapshots, approximately two seconds apart, **2026-10-10 16:23:50.384297–16:24:00.765257 UTC**. Host-monotonic first-to-last CPU denominator **10.3230605 seconds**. Each reads, in one short-lived command:

`docker exec homarr-nitro-fixture-fixture-1 cat /sys/fs/cgroup/memory.current /sys/fs/cgroup/cpu.stat /proc/1/status`

| Observation | Returned/derived value | Unit/basis |
| --- | --- | --- |
| Total container cgroup memory range | **100,102,144–109,035,520 bytes** (**95.465–103.984 MiB**) | cgroup-v2 `memory.current`; includes cache and auxiliary processes |
| Bun PID1 resident memory range | **68,894,720–70,336,512 bytes** (**65.703–67.078 MiB**) | `/proc/1/status` VmRSS; kernel kB interpreted as KiB ×1024; distinct from total container memory |
| Cgroup CPU usage increment | **134,101 µs** | `cpu.stat usage_usec` delta; user81,777 µs, system52,325 µs (counter rounding accounts for 1 µs difference) |
| CPU over sample window | **1.299% of one core** | CPU usage delta / host-monotonic wall window; not Docker multi-core-normalized percent |
| Local image uncompressed size | **238,088,464 bytes / 227.059 MiB** | Docker image inspect `Size`, not transfer/compressed size |
| Compressed image size | **Unavailable** | No authoritative total distribution-size result obtained; not inferred from base downloads |

**Workload/cache caveat:** existing mutable two-board synthetic fixture with uncontrolled human traffic. Last checkpoint reported revision5/healthy73, but this collector did not interrogate or reset current board/source/session/cache state. Human actions may have changed it. Regular healthchecks, page/file cache and tiny transient observer processes are included in cgroup counters; file reads within each snapshot are non-atomic. This is an exploratory warm-existing-process snapshot, **not a fair benchmark, an idle/cold baseline, or comparable whole-Homarr RAM savings**. No browser asset-transfer/startup/HTTP timing collection was added.

### Safe raw evidence and remaining outcomes

New files under `.scratch/nitro-feasibility/results/`: `baseline-final-status.json`, `baseline-final-lint.log`, `baseline-final-typecheck.log`, `baseline-final-provenance.json` (per-file hashes, selected identities, image bytes), `baseline-final-samples.json` (timestamped raw cgroup/proc counters, derived window/ranges). No tokens/cookies/env were recorded.

Final scoped source checks now pass for the image-matching source. **All earlier unrun feature/race/expiry/delayed-render/restart/cold-cache/session/persistence and broader acceptance outcomes remain pending.** No rebuild was needed or authorized here. The playable URL, container and preserved volume remain unchanged for the human; no modification/resource ownership was reacquired from the coordinator or researchers.
