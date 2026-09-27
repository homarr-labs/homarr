# Homarr v2 dashboard cold-load and RAM investigation — handoff

## Mission and current decision

Compare `release/v2` **against itself before and after fixes**, not against `main`. The reported symptom is a slow first dashboard load with cold caches, apparently staggered widget requests, a much faster reload, and server RAM that may have increased despite a “~30% less RAM” claim. The user requested code fixes, Docker builds with fresh demo seeding, before/after measurements, and a realistic assessment of remaining opportunities.

**Keep the narrower streaming change and stable Assistant path. Drop the broad integration-prefetch experiment.** The seven-round broad-prefetch candidate was slower; a three-round ablation without it recovered the earlier latency. `apps/nextjs/src/app/[locale]/boards/(content)/_widget-data-prefetch.ts` was our untracked experiment and has now been deleted. The three-round ablation image still had that _unreferenced_ file in its Docker build context, but the board page did not import or execute it.

The implementation is on **`fix/v2-dashboard-stream`**, published to `origin/fix/v2-dashboard-stream` at [GitHub](https://github.com/homarr-labs/homarr/tree/fix/v2-dashboard-stream), forked from `release/v2` commit `872e9acd39bf97ac26ccdb1da2618cc3814e55e0`. In a fresh checkout, run `git fetch origin fix/v2-dashboard-stream` and `git switch --track -c fix/v2-dashboard-stream origin/fix/v2-dashboard-stream`; in the existing worktree at `/tmp/opencode/homarr-v2-dashboard-stream`, inspect its checked-out branch instead. Read the pushed commit SHA with `git rev-parse origin/fix/v2-dashboard-stream`. The baseline detached worktree is `/tmp/opencode/homarr-v2-dashboard-baseline`. The original checkout at `/home/habs/work/homarr` is a different feature branch with unrelated user edits; leave it alone. This `TASK.md`, the benchmark runner, and the implementation are part of the pushed branch. The JSON benchmark results live separately under `/tmp/opencode/` and are not part of the commit.

## Instructions for the next agent

- **Main GPT-6-Sol owns code edits.** The user explicitly requested GPT-6-Luna sub-agents for focused tests/validation; use Luna 6 for that role when available. Earlier agents were `codex/gpt-6-luna`, IDs `3309f49f-2984-4a42-9f91-49364ba4b2af` (focused tests) and `a386859f-96fa-4e23-b2b9-56c47aaa0a43` (benchmark review/runs). Agents were told not to edit files.
- Review the worktree and saved results first. **Do not repeat the completed seven-round baseline/initial-candidate paired run, three-round LCP probe, seven-round broad-prefetch candidate run, or three-round Assistant-only ablation.** A new run is justified only for materially changed runtime behavior or a new metric. Preserve the JSON artifacts listed below.
- `pnpm` is on the `mise` PATH in these worktrees: run `mise exec -- pnpm ...` if a direct `pnpm` command is unavailable. Follow the worktree's `AGENTS.md`. Keep checks focused; the one new spec and the Assistant router spec already ran successfully.
- No API usage-limit error is currently blocking tools. If a subsequent limit does block work, stop with a clear report, preserve worktrees/images/results, and provide the continuation prompt below.

## Implemented changes retained in the worktree

1. `apps/nextjs/src/app/[locale]/boards/(content)/_creator.tsx`: board lookup begins alongside auth and integration-permission lookup; success no longer waits for auth before starting app/bookmark data. The page registers pending app/bookmark queries, dehydrates them, and returns a `Suspense` boundary around integration permissions and `ClientBoard`. The fallback is `_loading-shell.tsx`. Board lookup is still needed before any page content can be returned; the fallback streams only while integration permissions/board rendering suspend.
2. `packages/widgets/src/prefetch.ts`, `app/prefetch.ts`, `bookmarks/prefetch.ts`: direct server registration of app/bookmark `QueryClient.prefetchQuery` calls, sharing a DB batch per kind. `makeQueryClient` already includes pending queries in `dehydrate`, so DB misses can resolve over the RSC stream rather than gating the page. Only these two widget kinds are server-prefetched in the retained code; integration-backed widgets still use their own hooks. `packages/widgets/src/prefetch.spec.ts` verifies pending dehydration and query keys for both kinds.
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

The **paired** first change demonstrated ~35% faster cold widget implementation mounting and ~10% faster cold app/bookmark content. It did **not** demonstrate reduced HTTP requests or server RAM. Separate-run broad prefetch worsened cold/warm timings ~0.17 seconds and was therefore removed. The Assistant-only ablation recovered approximately the first candidate's data-readiness times; this is supportive but **not a paired causal comparison**. The initial seven-round warm LCP median was worse on the first candidate, but the three-round probe showed 1,468 ms before vs 1,460 ms after with different LCP elements; do not claim a warm-LCP regression or improvement from this evidence.

Before measurement, the main agent gave explicitly subjective 0–100 estimates: v2 before **42**, early candidate **53**, realistic later **78**, and wild best plausible **92** for cold UX plus low RAM. After the paired result, the early candidate was revised to roughly **56**: substantial cold implementation-mount improvement, modest measured data-readiness improvement, and no RAM gain. These are judgement scores, **not measured percentages or release claims**. A possible remaining upside of 20–40% cold data readiness and 10–25% steady server memory was stated as a hypothesis only; the fast-mock demo cannot validate those figures. The original “~30% less RAM” marketing claim remains unsupported by these measurements.

Memory is inconclusive. In the paired seven-round run, settled `memory.current` was 388,247,552 B before vs 394,334,208 B after (+5.8 MiB); the three-round LCP probe moved in the opposite direction. The Assistant-only ablation's post-workload/settled cgroup figures were 357,875,712/313,946,112 B, with a ~42 MiB fall during its short settle. These are sparse **container-wide** snapshots (Node + Redis + file cache), not Node heap/RSS or steady-state peak measurements. There is **no evidence for a “~30% less RAM” claim**. Likewise, HTTP request counts are not tRPC operation or response counts; older paired results did not record operation counts. The seeded demo uses fast mock integrations, not a realistic slow remote API.

## Validation completed

- Both baseline and candidate Docker builds succeeded, including production Next.js compilation. The retained Assistant-only runtime image was built and ran on the seeded 63-widget board without benchmark/browser errors. Benchmark-created containers and volumes were cleaned up.
- Luna 6 (read-only) ran `mise exec -- pnpm exec vitest run packages/widgets/src/prefetch.spec.ts --project dom`: **1 passed** after the main agent fixed server logger mocking.
- Luna 6 ran `mise exec -- pnpm exec vitest run packages/api/src/router/test/assistant.spec.ts --project api-node`: **14 passed**.
- Affected `@homarr/widgets`, `@homarr/api`, and `@homarr/nextjs` typechecks passed again **after** deleting the unreferenced `_widget-data-prefetch.ts`; targeted source/docs oxfmt checks and `git diff --check` passed. Oxlint passed except for existing stylesheet side-effect-import warnings in layout. `bash -n scripts/run.sh` passed. No full suite is needed.
- A Luna review confirmed pending query key shapes match consumers, integration middleware preserves per-request authorization, and the now-removed broad scheduler enforced four in-flight/eight registered queries. There is no need to retest that removed experiment.

## What remains after this handoff

1. Deliver a concise, evidence-ranked report: the narrower change improves cold mount and app/bookmark readiness; broad integration SSR prefetch regressed on this demo and was removed; stable Assistant removes post-hydration board remount; RAM/request-count marketing claims remain unsupported. Distinguish seven **paired** rounds from later independent ablations. Give artifact paths and the branch/worktree location. Do not claim a 30% RAM reduction.
2. The final ablation image's only post-build source change was deletion of an **unimported untracked** `_widget-data-prefetch.ts`, so its runtime path is the retained code. If exact source provenance is required, rebuild the final tag from the cleaned worktree; the user asked to avoid duplicating completed benchmark runs, so rebuilding does not imply rerunning measurements.
3. For future work, measure a board with slow real integrations and instrument **actual widget data readiness**, SSR stream timings, per-process Node RSS/heap, Redis separately, and tRPC operation timing. A small _client-side early query primer_ could start selected data on board hydration before lazy widget chunks load without doing the same work on the server; treat this as an untested hypothesis. Consider also budgeted response caches and an LCP fixed-observation-window benchmark. Avoid implementing unmeasured sweeping prefetch in this handoff.

## Suggested skills for the next agent

- `codebase-context` to navigate the board/API/widget package boundaries.
- `diagnosing-bugs` to insist on a tight before/after loop and distinguish timings from hypotheses.
- `documentation-sync` only if further user-visible behavior changes need explanation; the current Assistant page is already updated.
- `vercel-react-best-practices` / `next-best-practices` only when editing the React/Next data path.
- `handoff` and `writing-for-agents` if this document is revised for another session.

## Paste-ready continuation prompt

> Continue Homarr's v2 dashboard first-render/low-RAM task from pushed branch [`origin/fix/v2-dashboard-stream`](https://github.com/homarr-labs/homarr/tree/fix/v2-dashboard-stream), based on `release/v2@872e9acd`. In a fresh checkout, run `git fetch origin fix/v2-dashboard-stream` and `git switch --track -c fix/v2-dashboard-stream origin/fix/v2-dashboard-stream`. Read `TASK.md` at the branch root fully, then inspect `git status`, the branch's latest commit, and its diff from `release/v2`. In the existing worktree use `/tmp/opencode/homarr-v2-dashboard-stream`; the original checkout `/home/habs/work/homarr` has unrelated user changes. Main GPT-6-Sol owns code edits; use GPT-6-Luna agents for focused tests or benchmark scrutiny. Compare v2 before vs v2 after, never `main`. Do not repeat the completed seven-round paired baseline, three-round LCP probe, seven-round broad-prefetch run, or three-round Assistant-only ablation; saved JSON results are in `/tmp/opencode/` at paths in TASK.md and were not pushed. Retain nonblocking app/bookmark pending-query hydration, lightweight parallel Assistant availability, V8 semi-space flag, docs, focused prefetch spec, and benchmark runner. Broad server integration prefetch measured slower and was removed. Report the measured cold mount/content improvement separately from independent ablations; RAM reduction and fewer browser HTTP requests are not proven, and the demo uses fast mocks rather than slow real integrations. Focused tests and typechecks already passed. For further changes, establish a new metric first, keep query work bounded, and build/benchmark only for materially changed runtime behavior. Preserve the JSON artifacts. If tool/API limits block work, state the blocker and hand back this branch, TASK.md, artifacts, and next action.
