# Homarr v2 dashboard cold-load and RAM investigation — handoff

## Mission and current decision

Compare `release/v2` **against itself before and after fixes**, not against `main`. The reported symptom is a slow first dashboard load with cold caches, apparently staggered widget requests, a much faster reload, and server RAM that may have increased despite a “~30% less RAM” claim. The user requested code fixes, Docker builds with fresh demo seeding, before/after measurements, and a realistic assessment of remaining opportunities.

**Historical b5d971a decision:** keep the narrower streaming change and stable Assistant path; drop that specific broad integration-prefetch experiment. The restored-board follow-up below supersedes this scope decision with a different measured implementation. The seven-round broad-prefetch candidate was slower; a three-round ablation without it recovered the earlier latency. `apps/nextjs/src/app/[locale]/boards/(content)/_widget-data-prefetch.ts` was our untracked experiment and has now been deleted. The three-round ablation image still had that _unreferenced_ file in its Docker build context, but the board page did not import or execute it.

The b5d971a implementation is on **`fix/v2-dashboard-stream`**, published to `origin/fix/v2-dashboard-stream` at [GitHub](https://github.com/homarr-labs/homarr/tree/fix/v2-dashboard-stream), forked from `release/v2` commit `872e9acd39bf97ac26ccdb1da2618cc3814e55e0`. In a fresh checkout, run `git fetch origin fix/v2-dashboard-stream` and `git switch --track -c fix/v2-dashboard-stream origin/fix/v2-dashboard-stream`; in the existing worktree at `/tmp/opencode/homarr-v2-dashboard-stream`, inspect its checked-out branch instead. Read the pushed commit SHA with `git rev-parse origin/fix/v2-dashboard-stream`. The baseline detached worktree is `/tmp/opencode/homarr-v2-dashboard-baseline`. The original checkout at `/home/habs/work/homarr` is a different feature branch with unrelated user edits; leave it alone. The original `TASK.md`, benchmark runner and implementation are pushed. The restored-board follow-up is checkpointed in a local follow-up commit for rollback; inspect the current task-worktree HEAD. The JSON benchmark results live separately under `/tmp/opencode/` and are not part of the commit.

## Instructions for the next agent

- **Main GPT-6-Sol owns code edits.** The user explicitly requested GPT-6-Luna sub-agents for focused tests/validation; use Luna 6 for that role when available. Earlier agents were `codex/gpt-6-luna`, IDs `3309f49f-2984-4a42-9f91-49364ba4b2af` (focused tests) and `a386859f-96fa-4e23-b2b9-56c47aaa0a43` (benchmark review/runs). Agents were told not to edit files.
- Review the worktree and saved results first. **Do not repeat the completed seven-round baseline/initial-candidate paired run, three-round LCP probe, seven-round broad-prefetch candidate run, or three-round Assistant-only ablation.** A new run is justified only for materially changed runtime behavior or a new metric. Preserve the JSON artifacts listed below.
- `pnpm` is on the `mise` PATH in these worktrees: run `mise exec -- pnpm ...` if a direct `pnpm` command is unavailable. Follow the worktree's `AGENTS.md`. Keep checks focused; the one new spec and the Assistant router spec already ran successfully.
- No API usage-limit error is currently blocking tools. If a subsequent limit does block work, stop with a clear report, preserve worktrees/images/results, and provide the continuation prompt below.

## Implemented changes retained in the worktree

1. `apps/nextjs/src/app/[locale]/boards/(content)/_creator.tsx`: board lookup begins alongside auth and integration-permission lookup; success no longer waits for auth before starting app/bookmark data. The page registers pending app/bookmark queries, dehydrates them, and returns a `Suspense` boundary around integration permissions and `ClientBoard`. The fallback is `_loading-shell.tsx`. Board lookup is still needed before any page content can be returned; the fallback streams only while integration permissions/board rendering suspend.
2. `packages/widgets/src/prefetch.ts`, `app/prefetch.ts`, `bookmarks/prefetch.ts`: direct server registration of app/bookmark `QueryClient.prefetchQuery` calls, sharing a DB batch per kind. `makeQueryClient` already includes pending queries in `dehydrate`, so DB misses can resolve over the RSC stream rather than gating the page. Only these two widget kinds were server-prefetched at the pushed b5d971a revision; the real-board follow-up below adds integration queries. `packages/widgets/src/prefetch.spec.ts` verifies pending dehydration and query keys for both kinds.
3. Assistant availability: `packages/api/src/assistant-availability-server.ts` reads only the needed configuration columns; `packages/api/src/router/assistant.ts` reuses that check. The root `apps/nextjs/src/app/[locale]/layout.tsx` starts the request-scoped availability lookup alongside auth, settings, and color scheme, without a serial auth → tRPC context → configuration waterfall. `assistant-gate.tsx` receives final server availability, keeping enabled boards under the same provider from SSR through hydration. This supersedes the earlier client-deferred check (which would have remounted an enabled board). Caveat: anonymous requests also start the small availability read, then display `unauthenticated`; consider whether avoiding this extra anonymous DB work is worth changing the measured runtime. `apps/docs/docs/management/assistant.mdx` describes the final behavior.
4. `scripts/run.sh`: restores `NODE_OPTIONS="--max-semi-space-size=4 ${NODE_OPTIONS:-}"` for production Next.js.
5. `scripts/v2-dashboard-benchmark.mts`: focused paired/after-only Docker benchmark, included on this branch. It creates its own fresh named demo-data volumes, starts images with `DEMO_MODE`, `UNSAFE_ENABLE_MOCK_INTEGRATION`, and `NO_EXTERNAL_CONNECTION`, authenticates a fresh Chromium context, clears Redis and waits 11 seconds for the 10-second in-process L1 cache before each cold document, then performs same-tab warm reloads. Records TTFB, FCP, LCP/candidate element, visible-board time, implementation mount, 12 populated app tiles + 6 bookmarks, browser tRPC HTTP requests and (newer runs) operation counts, and container cgroup/Redis memory. Its visible-board selector was hardened after a hidden duplicate board caused one aborted run. New runs default to ignored `benchmark-results/v2-dashboard-metrics.json` (override with `V2_BENCHMARK_OUTPUT`); earlier artifacts are at the separate `/tmp/opencode/` paths below. The script removes only its own ephemeral containers/volumes.

### Important source references

- Board page: `apps/nextjs/src/app/[locale]/boards/(content)/_creator.tsx`
- Board layout/SSR: `apps/nextjs/src/app/[locale]/boards/_layout-creator.tsx`
- Widget loading: `apps/nextjs/src/components/board/items/item-content.tsx`, `packages/widgets/src/manifest.ts`
- Query dehydration: `packages/api/src/shared.ts`
- Client persistence and cache policy: `apps/nextjs/src/app/[locale]/_client-providers/{trpc.tsx,query-persistence.ts}`, `packages/api/src/query-cache.ts`
- Response cache: `packages/request-handler/src/lib/{request-handler.ts,shared-cache.ts}`
- Demo board: `packages/db/migrations/seed.ts` (63 widget instances in measured desktop view)
- Assistant root and provider: `apps/nextjs/src/app/[locale]/layout.tsx`, `apps/nextjs/src/components/assistant/{assistant-gate.tsx,assistant-provider.tsx}`

## Docker images and saved measurements

| Role                      | Tag                                | Image ID prefix | Purpose                                                                                                 |
| ------------------------- | ---------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| v2 before                 | `homarr:v2-board-before-872e9acd`  | `c7b408f7f6cb`  | Exact `release/v2` baseline                                                                             |
| First candidate           | `homarr:v2-board-after-stream`     | `f6bbed680ee1`  | Streaming app/bookmarks, client-deferred Assistant with demo enabled hint, Node flag                    |
| Broad-prefetch experiment | `homarr:v2-board-prefetch-stable`  | `b6e2351c2fbf`  | Plus bounded eight-query/four-concurrent integration SSR prefetch and stable Assistant                  |
| Assistant-only ablation   | `homarr:v2-board-stable-assistant` | `2241580eb3a0`  | Streaming app/bookmarks and lightweight parallel server Assistant; **no integration SSR prefetch call** |

Artifacts (JSON with per-round samples and methodology, no stored auth state):

- `/tmp/opencode/homarr-v2-dashboard-metrics-7.json` — **seven paired rounds**, exact v2 baseline and first candidate. Primary controlled comparison.
- `/tmp/opencode/homarr-v2-dashboard-lcp-probe.json` — three additional paired rounds with LCP element details; initial warm-LCP regression did **not** reproduce.
- `/tmp/opencode/homarr-v2-board-prefetch-stable-7.json` — seven **candidate-only** rounds for the broad integration-prefetch experiment. This image was slower despite fewer browser HTTP requests.
- `/tmp/opencode/homarr-v2-board-stable-assistant-3.json` — three **candidate-only** ablation rounds after removing broad integration prefetch. This returned to roughly the first candidate's latency. The older incomplete three-round broad-prefetch attempt had a strict locator error before saving a JSON file; its partial console timings are not a result.

### Observed medians, milliseconds

| Metric                                    | v2 before (paired n=7) | First candidate (paired n=7) | Broad-prefetch candidate (separate n=7) | Assistant-only ablation (separate n=3) |
| ----------------------------------------- | ---------------------: | ---------------------------: | --------------------------------------: | -------------------------------------: |
| Cold TTFB                                 |                    120 |                          114 |                                     143 |                                    130 |
| Cold board visible                        |                    298 |                          256 |                                     306 |                                    337 |
| Cold widgets mounted                      |                  2,467 |                        1,594 |                                   1,816 |                                  1,635 |
| Cold apps/bookmarks populated             |                  2,491 |                        2,242 |                                   2,418 |                                  2,232 |
| Cold FCP                                  |                    204 |                          168 |                                     200 |                                    212 |
| Cold LCP (unstable candidate)             |                  1,628 |                        1,520 |                                   1,728 |                                  1,556 |
| Warm widgets mounted                      |                  1,104 |                        1,091 |                                   1,249 |                                  1,122 |
| Warm apps/bookmarks populated             |                  1,563 |                        1,540 |                                   1,702 |                                  1,543 |
| Browser tRPC **HTTP requests**, cold/warm |                   10/5 |                         10/5 |                                     9/5 |                                   10/5 |

The **paired** first change reduced the runner's cold widget-marker observation by ~35% and its subsequent app/bookmark observation by ~10%. The app/bookmark check runs after the widget-marker wait, so it is an upper bound rather than an independent first-content timestamp. SSR can also supply widget-ready markers before React attaches; these markers alone do not prove client hydration. It did **not** demonstrate reduced HTTP requests or server RAM. Separate-run broad prefetch worsened cold/warm timings ~0.17 seconds and was therefore removed. The Assistant-only ablation recovered approximately the first candidate's data-readiness times; this is supportive but **not a paired causal comparison**. The initial seven-round warm LCP median was worse on the first candidate, but the three-round probe showed 1,468 ms before vs 1,460 ms after with different LCP elements; do not claim a warm-LCP regression or improvement from this evidence.

Before measurement, the main agent gave explicitly subjective 0–100 estimates: v2 before **42**, early candidate **53**, realistic later **78**, and wild best plausible **92** for cold UX plus low RAM. After the paired result, the early candidate was revised to roughly **56**: substantial cold implementation-mount improvement, modest measured data-readiness improvement, and no RAM gain. These are judgement scores, **not measured percentages or release claims**. A possible remaining upside of 20–40% cold data readiness and 10–25% steady server memory was stated as a hypothesis only; the fast-mock demo cannot validate those figures. The original “~30% less RAM” marketing claim remains unsupported by these measurements.

Memory is inconclusive. In the paired seven-round run, settled `memory.current` was 388,247,552 B before vs 394,334,208 B after (+5.8 MiB); the three-round LCP probe moved in the opposite direction. The Assistant-only ablation's post-workload/settled cgroup figures were 357,875,712/313,946,112 B, with a ~42 MiB fall during its short settle. These are sparse **container-wide** snapshots (Node + Redis + file cache), not Node heap/RSS or steady-state peak measurements. There is **no evidence for a “~30% less RAM” claim**. Likewise, HTTP request counts are not tRPC operation or response counts; older paired results did not record operation counts. The seeded demo uses fast mock integrations, not a realistic slow remote API.

## Validation completed

- Both baseline and candidate Docker builds succeeded, including production Next.js compilation. The retained Assistant-only runtime image was built and ran on the seeded 63-widget board without benchmark/browser errors. Benchmark-created containers and volumes were cleaned up.
- Luna 6 (read-only) ran `mise exec -- pnpm exec vitest run packages/widgets/src/prefetch.spec.ts --project dom`: **1 passed** after the main agent fixed server logger mocking.
- Luna 6 ran `mise exec -- pnpm exec vitest run packages/api/src/router/test/assistant.spec.ts --project api-node`: **14 passed**.
- Affected `@homarr/widgets`, `@homarr/api`, and `@homarr/nextjs` typechecks passed again **after** deleting the unreferenced `_widget-data-prefetch.ts`; targeted source/docs oxfmt checks and `git diff --check` passed. Oxlint passed except for existing stylesheet side-effect-import warnings in layout. `bash -n scripts/run.sh` passed. No full suite is needed.
- A Luna review confirmed pending query key shapes match consumers, integration middleware preserves per-request authorization, and the now-removed broad scheduler enforced four in-flight/eight registered queries. There is no need to retest that removed experiment.

## Historical follow-up: bounded client DNS primer (removed)

The superseded follow-up started one eligible DNS summary query before the lazy widget tree, using the widget's exact ordered integration IDs and shared query cache. It waits for persisted-cache restoration, requires use access to every selected integration, skips empty inputs and inputs above four integrations, and excludes collapsed sections in the active layout. Cache presence prevents this primer from initiating stale-entry refetches; normal widget hooks still own those. Existing streaming/Assistant/Node changes remain intact.

A controlled AdGuard HTTP fixture replaces only the seeded DNS integration. Its three concurrent endpoints return known values after either 0 or 1,500 ms. A local npm release fixture removes an unrelated external GitHub tail. These are synthetic services through production adapters, not proof on a real slow-service board. Each cold sample uses a fresh authenticated browser context, fresh named demo volumes, Redis flush and L1 expiry. The containers use two CPUs and 1 GiB.

| Independent cold DNS DOM readiness        | Retained branch | Client primer |                       Rounds |
| ----------------------------------------- | --------------: | ------------: | ---------------------------: |
| Fast fixture, pooled pilot + confirmation |        1,785 ms |      1,519 ms | 7 paired, two runtime blocks |
| 1,500 ms fixture delay                    |        2,952 ms |      2,621 ms |                     3 paired |

The fast fixture confirms about 15% earlier DNS values. On the slow fixture the gain is about 11%. Apps/bookmarks and widget hydration remain approximately flat. Browser HTTP counts remain equal. Each cold sample made exactly three DNS upstream calls; four paired warm reloads made zero fixture upstream calls in both images. This demonstrates cache reuse, not a broad warm-load speed claim. RAM was not measured.

The older `initialQueriesSettledDomMs` field in the pilot and confirmation JSON measures generic loader disappearance. It misses chart skeletons and must not be called whole-board data completion. On the pooled fast fixture its medians were 2,231 vs 2,236 ms; on the slow pilot they were 2,962 vs 2,622 ms. The stronger probe required all 63 widgets attached, 78 observed active queries successful, chart skeletons absent and the local release version rendered for two animation frames. All 78 queries were also idle at each completed observation. In two paired rounds per condition, measured initial query/DOM completion was **2,937 → 2,602 ms** with the 1,500 ms DNS delay (about **11% earlier**). With fast DNS it was **2,396 → 2,457 ms**, so no fast whole-board improvement is established. This is a small controlled sample, not validation of every widget field, background subscription, or real-service board.

Local evidence (JSON remains outside Git):

- `/tmp/opencode/v2-readiness/results.json`: three paired original-v2 vs retained-branch slow-fixture samples; DNS readiness 2,951 vs 2,922 ms, about 1%, motivating further work.
- `/tmp/opencode/v2-readiness-diagnosis/`: CPU profiles and browser boundaries. SSR board visibility precedes React attachment by hundreds of milliseconds; the browser loads 196 JS resources in this fixture. Diagnostic timing is profiler-perturbed.
- `/tmp/opencode/v2-slow-prefetch-comparison/`: exploratory old broad-prefetch image comparison; it did not improve DNS readiness and was not restored.
- `/tmp/opencode/v2-client-primer-comparison/results.json`: three paired samples per delay condition.
- `/tmp/opencode/v2-client-primer-confirmation/results.json`: four supplemental fast pairs and warm-cache checks.
- `/tmp/opencode/v2-client-primer-evidence/REPORT.md` and `SHA256SUMS`: consolidated findings and verified artifact integrity.
- `/tmp/opencode/v2-query-completion-verification/results.json`: two paired rounds per condition with stronger completion instrumentation. Initial observer failures came from accidentally probing a tRPC provider proxy, not from dashboard errors.

Measured constraints guide the next changes:

1. Completion follows the slowest dependency path. Starting DNS earlier helps whole-board completion only while DNS is on that path.
2. Overlap service I/O with widget code loading. The primer saves roughly 0.27–0.33 seconds; it cannot remove the earlier hydration cost.
3. Count dependency duration, not just requests: the three AdGuard calls run concurrently, so a 1.5-second delay costs roughly 1.5 seconds, not 4.5.
4. Bound and select early work. A broad prefetch can add overhead without advancing the query that gates readiness.
5. Observe each event independently. SSR visibility, React attachment, populated data, loader disappearance and completed requests are distinct milestones.

Validation: production client-primer image built successfully; focused Next.js typecheck, source oxlint and formatting passed. Luna reviewed permission, layout, collapse and cache guards, then found no material flaw in the stronger completion marker. The two-pair completion result is directional evidence, not a stable population estimate. No new tests or broad suites were added or run.

Reproduction: `scripts/v2-integration-readiness/README.md` documents the portable runner, output creation, image overrides and the scoped completion definition. Its fixture setup matches the measured temporary runner. The portable version also requires query fetch status to be idle (all measured samples already satisfy this) and passes the encryption key through subprocess environment rather than Docker command arguments. Syntax checks passed; it was not rerun after packaging because runtime behavior and measured inputs are unchanged.

## Restored real-board follow-up (2026-09-27)

The user supplied an actual v2 backup, authorized read-only upstream requests, and requested all independent initial backend work started together for a cold browser with empty response caches. The restored home board has 26 items, 27 observed initial API queries and a selected 1,436-photo Immich album. The seeded DNS fixture is historical evidence; this board has no DNS widget.

### Current work and remaining targets

The restored-board follow-up supersedes the client DNS primer and the earlier fast-mock broad-prefetch decision. Its worktree is `/tmp/opencode/homarr-v2-dashboard-stream`; the original checkout has unrelated changes. Real upstream read-only requests with restored credentials were explicitly authorized. Private backup copies, runtime configuration and measurements stay outside Git under `/tmp/opencode/v2-real-board/`. Never print credentials, service URLs, raw query inputs or board data.

Retain the original app/bookmark streaming, parallel Assistant availability and Node semi-space flag. The new server prefetch registers exact consumer keys without a global concurrency limit, selects the initial layout and skips collapsed ancestry; existing API permissions and refresh behavior apply. Supported integration paths cover this restored board, plus DNS and Beszel grid. Calendar falls back to the browser around timezone-dependent month boundaries; dependent Beszel selection uses a separate streamed boundary. Other widget kinds retain their existing client query hooks. Do not claim every possible Homarr widget has server prefetch.

Measured completion is all 26 widget instances attached, 27 observed active API queries successful and idle, no detected top-level integration failures or generic loaders/Beszel skeletons for three frames. Docker endpoint availability is a separate result-shape limit, described below. This excludes complete image loading and ongoing SSE updates. Record first board visibility and hydration separately: a faster complete-data result can still regress first paint.

Next substantive target is the remaining server rendering / browser hydration critical path, without truncating albums or changing randomization. Query results must not be sent twice through both hydration transports. Preserve loader retry behavior; the experimental generic next/dynamic registry wrappers were slower and reverted. The paired restored-board RAM evidence is recorded below; do not infer a 30% reduction.

### 2026-09-28 paired RAM measurement

The retained v2 baseline and the staged-render image ran the same restored 26-item board in isolated 2-CPU/1-GiB Docker containers. A 100 ms host sampler followed each cgroup across restarts and aligned its numeric readings with the browser navigation epoch and complete-data time. Two alternating cold loads per image restarted the process and cleared Redis; two warm reloads per image followed successful cold loads. Warm reload samples also included a fixed five-second settle window. The first attempted RAM sampler lost its cgroup path on restart; its result was discarded. The corrected artifacts are `live-memory-paired-valid-data-cold.json`, `live-memory-samples-20260928.jsonl`, `live-memory-warm-reload.json`, `live-memory-warm-samples-20260928.jsonl`, and `live-memory-aligned-summary.json` under `/tmp/opencode/v2-real-board/`.

| Two-pair median | Retained v2 before | Staged candidate | Relative change |
| --- | ---: | ---: | ---: |
| Cold navigation cgroup peak | 474.1 MiB | 387.7 MiB | 18.2% lower |
| Cold navigation cgroup anonymous peak | 458.7 MiB | 374.9 MiB | 18.3% lower |
| Cold navigation Next process RSS peak | 517.2 MiB | 432.2 MiB | 16.4% lower |
| Warm reload cgroup peak | 489.7 MiB | 414.5 MiB | 15.4% lower |
| Warm reload Next RSS peak | 533.3 MiB | 458.3 MiB | 14.1% lower |
| Five seconds after warm data completion, cgroup | 483.8 MiB | 399.6 MiB | 17.4% lower |

`memory.current` includes Redis, kernel memory and file cache; Next RSS is a distinct process measurement and must not be added to cgroup memory. The cgroup file cache field was about 0–1 MiB in these navigation windows; most of the change was anonymous memory. These are short, two-pair observations on this board, not steady-state production sizing, Node heap data or evidence for 30% less RAM. In the new RAM block, cold data completion still improved, but cold board paint varied much more than the earlier block; do not pool timings across blocks.

### Final retained candidate: staged widget rendering

**Current retained image:** `homarr:v2-board-stream-staged-render`, SHA-256 `223a19c41b2523a1e4a464eb6417620b0b62f2a8c554c19596cf85d0c0a3459e`. This supersedes the full-widget SSR candidate below. Source is checkpointed locally in the task worktree. Backend query initiation and full result streaming are unchanged. App/bookmark tiles retain their server-rendered HTML; other widgets use the existing loading-card appearance during SSR and initial hydration, then render in the browser. A stable `useSyncExternalStore` server snapshot prevents hydration mismatch. This intentionally defers static/custom widget contents too; it is not an all-widget server prefetch implementation.

| Final comparison | Retained v2 before | Staged candidate | Scope |
| --- | ---: | ---: | --- |
| Cold browser + empty response caches, pair 1 | 4,832 ms | 2,355 ms | Complete widget data; 51% earlier |
| Cold browser + empty response caches, pair 2 | 6,740 ms | 2,209 ms | Complete widget data; 67% earlier; retain the before outlier |
| Same two pairs: first visible board, median | 633 ms | 805 ms | Cold first paint still regresses |
| Same two pairs: all widgets attached, median | 1,298 ms | 1,711 ms | Hydration still later than baseline |
| Process-cold complete widget data | 5,333 ms | 2,866 ms | One paired sanity check, 46% earlier |
| Process-cold first album photo observed loaded | 6,029 ms | 2,878 ms | Observed upper bounds, one pair |
| Warm reload first visible board, median | 178 ms | 148 ms | Two pairs; warm paint preserved |
| Warm reload complete widget data, median | 1,172 ms | 1,091 ms | Two pairs; small directional gain |

The two ordinary cold pairs have a 5,786 → 2,282 ms median (about 61% earlier), but the before outlier affects that two-sample median. Report the actual range / per-pair values and the separate process-cold check; do not turn this into a p95 or population estimate. The earlier three-pair 37% and full-SSR two-pair 42% improvements remain independent evidence.

The staged-render change itself was isolated against the previous full-SSR candidate. In two cold pairs, completion was **2,469 → 2,382 ms** (about 3.5%, small), and first board paint **870 → 796 ms**. In two warm pairs it reduced first paint **226 → 149 ms** and complete data **1,286 → 1,145 ms**. This is why the guard was retained; do not attribute the full before/after gain solely to the guard or pool these blocks.

Every final staged sample had 26 attached widgets, 27 successful idle initial queries, zero detected top-level integration failures, zero browser exceptions and all 1,436 image assets returned by the album query. The direct cold full-versus-staged comparison also recorded zero console errors and no React error codes in either candidate. Initial widget/integration/docker data reads made no browser HTTP operations in the staged cold comparison; Assistant calls and local option mutations still occur. Baseline traces recorded an initial Jellyfin 401 in both ordinary cold samples; new traces had no initial 401, consistent with shared in-flight authentication avoiding the retry tail. This is a real adapter/authentication delay, not evidence of a global server query throttle.

In the latest ordinary cold pairs, the first observed upstream request started at **1,059–1,078 ms before versus 305–315 ms after**. The candidate had 56–57 of its 58 instrumented upstream starts before all widgets attached; the baseline had only one at that point. The separate process-cold check started upstream work at 1,491 versus 728 ms. These counts include image/background reads, and demonstrate earlier backend overlap rather than simultaneous completion of every HTTP call. Authentication, discovery and dependent paging still impose real ordering.

A separate read-only Docker result-shape check found one unavailable endpoint and zero containers in both the before and staged restores (`live-docker-result-validation.json`). The query succeeds with that unavailable endpoint inside its result. The timing probe does not detect nested Docker endpoint status, so “complete widget data” here means observed query completion for the available integrations, not a fully populated Docker inventory or proof that every widget value is correct. The local benchmark does not recreate the original host Docker socket. This limitation is unchanged across the comparison.

Latest evidence under `/tmp/opencode/v2-real-board/`:

- `live-paired-staged-render-data-cold.json`: two paired before/after rounds, including the before tail.
- `live-staged-render-process-cold.json`: no missing-board warmup; separate decoded-photo confirmation. Its photo-count field is collected after the wait; use `firstAlbumPhotoLoadedObservedMs` as an observed upper bound.
- `live-staged-render-warm-reload.json`: two before/after warm reload pairs.
- `live-paired-full-versus-staged-render-data-cold.json`: isolated cold rendering change, including console checks.
- `live-full-versus-staged-render-warm-reload.json`: isolated warm rendering change.
- `live-docker-result-validation.json`: aggregate endpoint availability check; unchanged unavailable Docker endpoint in both restores.

The staged production image and focused Next.js typecheck passed. Luna reviewed unconditional hook ordering, consistent server/client hydration snapshots, preserved app/bookmark SSR and error-boundary behavior after hydration. No new tests were added. The previous focused modal checks remain 12 passed tests. Cold first paint and hydration are still weaker than the original retained baseline; improving those without losing these complete-data and warm-paint gains remains the next target. The private source patch, report and integrity manifest include this final state. Final task containers were stopped; no deployment or publish occurred.

### Previous full-widget SSR candidate (superseded)

Previous candidate image: `homarr:v2-board-stream-final`, SHA-256 `4fbf43de95c760f35136c627b56a16fa61045d9fbb3b019b3e41dfbcc98097a1`. Its runtime source precedes the final staged-render guard; later source formatting and documentation edits do not change runtime behavior. The baseline in the new real-board comparisons is the retained b5d971a-era v2 image `homarr:v2-board-stable-assistant`, not main and not the original release image.

The retained implementation starts supported visible widget queries on the server without a global fan-out cap, overlaps auth/permissions/layout reads, warms only Redis connection readiness before board lookup, and streams pending query results. Query-hash ownership prevents duplicate transport by the RSC and experimental SSR hydration paths. Visible widget modules begin loading through a sibling client preloader. Jellyfin concurrent login and Beszel per-instance authentication are shared only while in flight; independent Overseerr/Beszel reads are parallel. Immich uses request-local credentials, larger metadata pages without EXIF, up to four overlapping album pages, and batched image-proxy registration using native UUIDs. All photos and existing randomization remain available. TLS context reuse is bounded and keyed by exact CA bytes; trusted certificates/hostname rules are still read for each new agent. The Assistant configuration modal now loads its editor lazily while preserving its original form, props and callbacks.

| Final metric | Retained v2 before | New retained source | Evidence |
| --- | ---: | ---: | --- |
| Cold browser + empty integration caches: complete widget data | 5,102 ms | 2,976 ms | Two alternating paired rounds, about 42% earlier |
| Same cold runs: first visible board | 675 ms | 856 ms | First paint regresses; do not hide this |
| Same cold runs: all widgets attached | 1,385 ms | 2,573 ms | Attachment regresses despite earlier complete data |
| First observed upstream request | 1,080 / 1,313 ms | 317 / 328 ms | Same two rounds |
| Process-cold complete widget data | 5,408 ms | 3,263 ms | One paired sanity check, about 40% earlier |
| Process-cold first album photo observed loaded | 5,909 ms | 3,356 ms | Observed upper bounds after query readiness, not exact image load events |
| Warm reload: complete widget data | 1,175 ms | 1,186 ms | Two paired reloads; approximately flat |
| Warm reload: first visible board | 164 ms | 432 ms | Warm first-paint regression remains |

Every final sample had 26 widget instances, 27 successful idle observed initial queries, zero detected top-level integration failures and zero browser errors. The complete-data metric does not include every image or ongoing SSE updates. All 1,436 image assets remained in the album query result. The process-cold photo probe separately confirmed a decoded first album image. In its JSON, `firstAlbumPhotoAtDataReady` was collected after the image wait; use `firstAlbumPhotoLoadedObservedMs` for that probe, not the misleading field name. In the ordinary cold JSON the photo-count field really was collected at data readiness.

The new source's final cold samples made zero initial browser **widget/integration/docker data-read** HTTP operations. Assistant runtime/thread calls and automatic widget-option mutations still occur. Do not generalize this to zero browser HTTP requests or fewer total HTTP requests. Instrumented upstream starts were 66 before and 58 after; these include background/image calls, not only widget data requests. RAM was not measured.

The earlier direct three-pair final block (`live-paired-final-data-cold.json`, before the last paging/lazy-modal refinements) was 4,986 → 3,152 ms, about 37% earlier, but included a 5,989 ms after outlier. An Immich search took 3,948 ms in that outlier. Keep it in the evidence; the latest two-pair result is a small sample and does not establish p95 latency. The earlier process-cold two-pair block was 5,207 → 3,386 ms. Do not pool separate runtime blocks or present small individual ablations as the whole-board gain.

Independent next/dynamic registry, client-only SSR guard, sibling promise bridge, cache-only handoff, six-event-loop-turn yield, fixed 100 ms query delay and both warm-success-exclusion variants were removed. The 100 ms delay did not protect first paint. Omitting fast resolved cached results did not fix warm paint; the corrected version preserved uncached Beszel history and was still rejected. Overlapping album pages was verified in the request trace, but its two-pair ablation showed approximately flat whole-board completion. Keep its bounded concurrency benefit separate from the measured combined gain. A request-payload audit found each of the 1,436 album asset IDs exactly once; the response remains about 1.3 MB decoded. A first-header CPU profile identified eager editor/CodeMirror module loading; diagnostic profiling perturbed timing and is not a headline benchmark.

Saved final evidence under `/tmp/opencode/v2-real-board/`:

- `live-paired-final-retained-data-cold.json`, `live-final-retained-process-cold.json`, `live-final-retained-warm-reload.json`: exact retained image.
- `live-paired-final-data-cold.json`, `live-paired-final-process-cold.json`: earlier direct three-pair / two-pair evidence, including the slow after sample.
- `live-default-beszel-selection-data-cold.json`: two candidate-only rounds with an unset system selection; 26/27 successful, all photos preserved.
- `live-paired-parallel-pages-data-cold.json`: page overlap and approximately flat completion ablation.
- `live-paired-shell-first-data-cold.json`, `live-cache-aware-warm-reload.json`: rejected scheduling/warm-handoff evidence.
- `live-payload-ownership-audit.json`: payload ownership audit; aggregate ID-occurrence counts were reported separately.
- `runtime-live-parallel-pages/first-render.cpuprofile`: diagnostic first-header CPU profile.
- `REPORT.md`, `final-metrics-summary.json`, `retained-source.patch`, `SHA256SUMS`: consolidated reviewable handoff and integrity manifest.

Focused validation: affected package typechecks and production builds passed; final Next.js typecheck passed. Existing `assistant-widget-tool.spec.ts` and `item-select-modal.spec.tsx` passed 12 tests, and the earlier focused Redis channel fallback spec passed. A private manual TLS probe passed 12 cases. Luna reviewed exact query inputs, permissions/layout/collapse guards, scoped credential handling, paging, stream ownership and the configuration-only lazy modal without finding a remaining blocker. No new tests or broad suites were added. The lazy Assistant form has source and existing-test validation; an interactive Assistant configure-tool dialog was not exercised.

The full-SSR result is historical. The final staged-render candidate fixes the warm paint regression; cold first paint and hydration still need improvement. Plausible next architectural targets are separating backend integration initialization from the rendering thread and separating small first-display data from bulky album/history metadata while preserving the complete data and current behavior. Targets of a 200–500 ms shell and 1–2 second fresh data require measurement and responsive upstreams; they are not established here. A four-second upstream call remains a four-second freshness floor for that result. Final task containers were stopped; private restored databases and image/artifact files remain local.

## Suggested skills for the next agent

- `codebase-context` to navigate the board/API/widget package boundaries.
- `diagnosing-bugs` to insist on a tight before/after loop and distinguish timings from hypotheses.
- `documentation-sync` only if further user-visible behavior changes need explanation; the current Assistant page is already updated.
- `vercel-react-best-practices` / `next-best-practices` only when editing the React/Next data path.
- `handoff` and `writing-for-agents` if this document is revised for another session.

## Paste-ready continuation prompt

> Continue Homarr's cold dashboard work in `/tmp/opencode/homarr-v2-dashboard-stream` on `fix/v2-dashboard-stream` (pushed baseline b5d971a; inspect the local follow-up HEAD). Read TASK.md fully and inspect the working diff before editing. A fresh fetch/checkout of origin alone does not contain the new real-board source changes. Preserve the original checkout's unrelated edits. Main owns source edits; GPT-6-Luna may perform focused read-only validation. Compare retained v2 vs changed v2, never main. Use the authorized restored 26-item home board and read-only upstreams; private backup/configuration/results live in `/tmp/opencode/v2-real-board/`, not Git. Keep credentials and service URLs out of output. Focus on fresh browser and empty integration response caches. Keep original app/bookmark streaming, parallel Assistant availability and semi-space flag. Current code preserves app/bookmark SSR, defers other widget contents until hydration, initiates supported initial widget queries on the server and streams pending results, shares concurrent Jellyfin login, parallelizes independent Overseerr/Beszel reads, preserves all album photos with larger metadata pages and batched image registration, and reuses bounded TLS contexts. Consult the latest result section before choosing the retained image. Do not repeat the completed original baseline/LCP/broad-prefetch/Assistant-only runs or historical DNS primer experiments. Only materially changed behavior, a new metric or an unresolved failure justifies a new benchmark. Report completion, first paint and hydration separately; report only the measured two-pair RAM reduction and avoid any 30% or universal all-widget prefetch claim. Do not add tests unless asked; use focused existing checks and browser evidence. Local rollback commits are requested for the continuation; no push or deployment has been requested.
