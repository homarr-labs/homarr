---
iteration: 2
max_iterations: 15
status: active
goal: "Implement Phase 1 homepage diet via Next.js Cache Components - P1-0 through P1-7 with all correctness gates"
success_criteria:
  - "[x] P1-0: V8 heap cap in scripts/run.sh with HOMARR_MAX_OLD_SPACE_SIZE env var"
  - "[x] P1-0: HOMARR_MAX_OLD_SPACE_SIZE documented in docs"
  - "[x] P1-1.1: Dynamic integration imports replacing 55 static imports in creator.ts"
  - "[x] P1-1.1: createRetryableLoader extracted to packages/common"
  - "[x] P1-1.1: creator.spec.ts testing all integration kinds load"
  - "[x] P1-1.2: DB driver loaded conditionally via DB_DRIVER env"
  - "[x] P1-1.3: jsdom replaced with linkedom for SVG sanitization"
  - "[x] P1-1.3: sanitize.spec.ts with XSS test corpus"
  - "[x] P1-1.4: Eager widget barrel deleted, imports repointed"
  - "[x] P1-2.1: cacheComponents enabled in next.config.ts with cacheLife profiles"
  - "[x] P1-2.2: Root layout restructured with Suspense boundaries"
  - "[x] P1-2.3: Board/manage/auth routes compatible with cacheComponents"
  - "[x] P1-3.1: Cache tag registry in packages/api/src/cache-tags.ts"
  - "[x] P1-3.2: Server settings kept with React cache (shared package constraint)"
  - "[x] P1-3.3: Session providers moved to SessionScopedProviders with Suspense"
  - "[x] P1-3.4: Per-request translation deep-merge eliminated"
  - "[x] P1-3.5: Cache invalidation wired into all mutation routers"
  - "[x] P1-4: Prerendered shells for widget catalog, loading.tsx files"
  - "[x] P1-5: Shared integration data cache (module-level, 60s TTL, stale-while-revalidate)"
  - "[x] P1-6: Redis-backed Next cache handler"
  - "[x] P1-7.1: Redis optional for single-instance (memory channel fallback)"
  - "[x] P1-7.1: TTL on pubSub:last:* keys (F4)"
  - "[x] P1-7.1: Redis clients consolidated from 6 to 2 (F3)"
  - "[x] All 25 new specs pass"
  - "[x] No diff to trpc.tsx or query-cache.ts"
  - "[ ] Reviewed with /review-pr at least once"
  - "[ ] All review issues fixed"
  - "[ ] Integration type map created for kind-to-class resolution"
last_verdict: null
last_reason: null
last_next: "Run /review-pr, fix issues, iterate until clean"
engine: cursor
---

## Progress log

### Iteration 1 — Implementation complete
- P1-0 through P1-7 all implemented via parallel subagents
- 66 files changed, 1280 insertions, 1229 deletions
- 25 new tests all passing
- Type errors from dynamic integration imports fixed with kind-map.ts

### Iteration 2 — Review cycle begins
- Need to commit, push, and run /review-pr
- Need to fix any issues found

## Blockers
None currently.

## Verification
- 25/25 tests pass
- trpc.tsx and query-cache.ts unchanged (constraint met)
- Integration type map resolves subclass methods correctly

## Task
Implement Phase 1 homepage diet via Next.js Cache Components - P1-0 through P1-7 with all correctness gates
