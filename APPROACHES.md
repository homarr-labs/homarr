# Memory Optimization Approaches

This document describes the approaches tried and considered for reducing the RAM footprint of Homarr's server processes.

## Baseline Architecture (Before)

Homarr runs **three separate Node.js processes**:

| Process | Port | Purpose |
|---|---|---|
| `apps/nextjs` (Next.js) | 3000 | Web UI + API routes |
| `apps/websocket` (WS server) | 3001 | tRPC WebSocket subscriptions |
| `apps/tasks` (Tasks/Cron server) | 3002 | Cron job scheduling + management API |

Each process loads its own V8 heap, duplicates shared dependencies (`@homarr/db`, `@homarr/auth`, etc.), and runs its own event loop.

**Measured baseline (dev mode, idle):** ~2,954 MB total RSS

---

## Approach 1: Integrate WebSocket Server into Next.js Custom Server

**Status:** ✅ Implemented

Eliminates `apps/websocket` by handling WebSocket upgrades inside a [Next.js custom server](https://nextjs.org/docs/pages/guides/custom-server):

```ts
const app = next({ dev, hostname, port, dir });
const upgradeHandler = app.getUpgradeHandler();

server.on("upgrade", (req, socket, head) => {
  if (req.url?.startsWith("/websockets")) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  } else {
    upgradeHandler(req, socket, head); // HMR, etc.
  }
});
```

### PROs
- Eliminates one V8 heap (~208 MB)
- WebSocket runs on same port as HTTP (simpler networking/proxying)
- Shared `@homarr/db` connection pool and module cache
- `getUpgradeHandler()` properly delegates HMR to Next.js in dev mode

### CONs
- Custom server disables some Next.js optimizations (automatic static optimization still works with `output: "standalone"`)
- WebSocket errors could affect the main server process
- Slightly more complex startup code

---

## Approach 2: Integrate Tasks/Cron Server into Next.js Custom Server

**Status:** ✅ Implemented (combined with Approach 1)

Eliminates `apps/tasks` by running the Fastify tRPC cron API and job scheduler inside the same process:

```ts
async function startTasksServer() {
  const tasksServer = fastify({ maxParamLength: 5000 });
  tasksServer.register(fastifyTRPCPlugin, { ... });
  await cleanupSessionsAsync();
  await invalidateUpdateCheckerCacheAsync();
  await jobGroup.initializeAsync();
  await jobGroup.startAllAsync();
  await tasksServer.listen({ port: CRON_JOB_API_PORT });
  return tasksServer;
}
```

### PROs
- Eliminates another V8 heap (~328 MB)
- Shared database connection pool across Next.js API routes and cron jobs
- Single process to manage (simpler Docker, `run.sh`, monitoring)
- Cron jobs can directly share in-memory state with the web server

### CONs
- A misbehaving cron job could affect web request latency
- Fastify still binds to port 3002 for internal tRPC communication (minor overhead)
- More dependencies in the custom server bundle

---

## Combined Result (Approaches 1 + 2)

| Component | Separate (before) | Integrated (after) |
|---|---|---|
| WebSocket server | ~208 MB | — |
| Tasks/Cron server | ~328 MB | — |
| Next.js (incl. workers) | ~2,418 MB | — |
| Custom Server (all-in-one) | — | ~2,007 MB |
| **Total RSS** | **~2,954 MB** | **~2,007 MB** |
| **Savings** | — | **~947 MB (~32%)** |

---

## Approach 3: Eliminate Fastify — Direct Function Calls for Cron API

**Status:** 📋 Considered, not implemented

Since the cron job API client (`cronJobApi`) is only used from Next.js API routes (same process now), we could replace the HTTP+tRPC client with direct function calls to `JobManager`:

```ts
// Before: HTTP call to localhost:3002/trpc
await cronJobApi.trigger.mutate({ name: "myJob" });

// After: direct call in same process
await jobManager.triggerAsync("myJob");
```

### PROs
- Eliminates Fastify dependency and port 3002 listener entirely
- Zero network overhead for cron API calls
- Simpler architecture (no internal HTTP, no API key needed)

### CONs
- Requires refactoring `packages/api/src/router/cron-jobs.ts` and `packages/cron-job-api`
- Breaks the clean separation between Next.js API and tasks concerns
- If the architecture ever splits back to separate processes, this would need to be reverted
- API key authentication for cron operations would need a different mechanism

---

## Approach 4: Node.js `--max-old-space-size` Flag

**Status:** 📋 Considered, available as user override

Setting `NODE_OPTIONS=--max-old-space-size=N` limits V8 heap growth and forces more aggressive garbage collection.

```dockerfile
# Example: limit heap to 512 MB
ENV NODE_OPTIONS="--max-old-space-size=512"
```

### PROs
- Can reduce peak memory usage in constrained environments
- Easy to configure via environment variable
- No code changes required

### CONs
- Too low a value causes OOM crashes under load
- Doesn't reduce actual memory *needed*, just forces earlier GC
- Default Node.js behavior (~1.7 GB limit on 64-bit) is reasonable for most deployments
- Different deployments have different memory constraints — no single good default

**Recommendation:** Don't set a default in the Dockerfile. Document as a tuning option for users running on low-memory hosts (e.g., `docker run -e NODE_OPTIONS="--max-old-space-size=512"`).

---

## Approach 5: Next.js `output: "standalone"` (Already in Use)

**Status:** ✅ Already configured

The `next.config.ts` already uses `output: "standalone"`, which:
- Traces only the files needed for production
- Creates a minimal `.next/standalone` directory
- Avoids shipping full `node_modules`

This is already optimized and no further action needed.

---

## Approach 6: Shared Redis Connection Pooling

**Status:** 📋 Considered, not implemented

With all services in one process, Redis connection pools could be shared. Currently, each module may create its own Redis client instance.

### PROs
- Fewer open connections to Redis
- Slightly less memory for connection buffers

### CONs
- Marginal memory savings (Redis connections are lightweight)
- Requires auditing all Redis usage across packages
- Risk of connection contention under high load

---

## Summary of Recommendations

| Approach | Impact | Effort | Status |
|---|---|---|---|
| 1. Integrate WS server | ~208 MB saved | Low | ✅ Done |
| 2. Integrate Tasks server | ~328 MB saved | Medium | ✅ Done |
| 3. Eliminate Fastify | ~10-30 MB saved | High | 📋 Future |
| 4. `--max-old-space-size` | Configurable | None | 📋 User option |
| 5. Standalone output | Already optimal | None | ✅ Already done |
| 6. Shared Redis pools | ~5-10 MB saved | Medium | 📋 Future |
| 7. Redis-backed initial query data | Faster page loads | Medium | 📋 POC documented |
| 8. Client-side rendering with ISR shell | Faster TTFB | High | 📋 POC documented |

---

## Approach 7: Redis-Backed TanStack Query Initial Data

**Status:** 📋 POC documented

### Problem

Currently, the dashboard page (`/`) is fully server-rendered on every request:

1. Server calls `api.board.getHomeBoard()` (database query)
2. Server prefetches all widget data via `prefetchForKindAsync()` (multiple database/integration queries)
3. Server renders the full React tree with hydration boundary
4. Client hydrates and takes over

Each page load triggers a cascade: **Client → Next.js Server → tRPC → Database → Back**. For data that doesn't change often (board layout, widget configurations), this is wasteful.

### Approach

Use Redis as a shared cache layer between cron jobs and page loads. Cron jobs already populate Redis with integration data. The idea is to:

1. **Cron jobs write to Redis** (already happening via `createItemAndIntegrationChannel`)
2. **Server reads from Redis first** instead of hitting the database for widget data
3. **Pass Redis data as `initialData`** to TanStack Query on the client
4. **Client-side queries take over** with stale-while-revalidate behavior

```tsx
// POC: In _creator.tsx, read from Redis cache first for widget prefetching
import { createItemAndIntegrationChannel } from "@homarr/redis";

// Instead of always calling the database:
const cachedData = await redisChannel.getAsync();
if (cachedData) {
  // Use cached data as initial query data - skip the database call
  queryClient.setQueryData(queryKey, cachedData.data);
} else {
  // Fall back to normal prefetch
  await prefetchForKindAsync(kind, queryClient, items);
}
```

On the client side, TanStack Query's `initialData` option lets us hydrate from cache:

```tsx
// Client component using cached initial data
const { data } = useQuery({
  queryKey: ["widget", widgetId],
  queryFn: () => fetchWidgetData(widgetId),
  initialData: cachedWidgetData, // From Redis via server props
  staleTime: 30_000, // Consider fresh for 30s
});
```

### How TanStack Query Initial Data Works

From the [TanStack Query docs](https://tanstack.com/query/v5/docs/framework/react/guides/initial-query-data):

- `initialData` pre-populates the query cache before the component mounts
- The query still revalidates in the background (stale-while-revalidate)
- Combined with `staleTime`, the query won't refetch until the data is considered stale
- This means the page renders instantly with cached data, then silently updates

### PROs
- **Faster page loads**: Redis reads are ~1ms vs ~50-200ms for database queries with joins
- **Reduced database load**: Most page views hit Redis instead of SQLite/MySQL/PostgreSQL
- **Leverages existing infrastructure**: Cron jobs already write widget data to Redis channels
- **Graceful degradation**: Falls back to normal database queries on cache miss
- **Non-breaking**: Can be adopted incrementally per widget type
- **Shared across users**: Non-personal data (board layout, widget data) is the same for all users viewing the same board

### CONs
- **Cache staleness**: Data may be up to one cron interval old (typically 1-5 minutes)
- **Cache invalidation complexity**: Need to invalidate Redis when boards are edited
- **Memory usage**: More data stored in Redis (marginal since it's already stored for pub/sub)
- **Serialization overhead**: superjson parse/stringify on every cache read
- **Testing complexity**: Need to test cache hit/miss/stale scenarios

### Estimated Impact

| Metric | Before | After (cache hit) | Improvement |
|---|---|---|---|
| Dashboard TTFB | ~200-500ms | ~50-100ms | 2-5x faster |
| Database queries per page load | 5-20 (depending on widgets) | 0-2 (board + auth only) | ~90% reduction |
| Redis reads per page load | 0 | 5-20 | Acceptable (~1ms each) |

### Implementation Path

1. Create a `createBoardCacheChannel(boardId)` in `@homarr/redis`
2. Populate it when boards are saved and when cron jobs update widget data
3. In `_creator.tsx`, check cache before `prefetchForKindAsync()`
4. Set `staleTime` to match cron interval for each widget type
5. Add cache invalidation when boards are edited (`board.saveBoard` mutation)

---

## Approach 8: Client-Side Rendering with ISR Static Shell

**Status:** 📋 POC documented (not recommended for Homarr's use case)

### Concept

Instead of server-rendering the entire dashboard on each request, serve a **static HTML shell** via Next.js ISR (Incremental Static Regeneration) and let the client fetch all dynamic content via TanStack Query.

```tsx
// Hypothetical ISR dashboard page
export const revalidate = 60; // Regenerate every 60 seconds

export default function DashboardPage() {
  // Return a static shell - no server-side data fetching
  return (
    <DashboardShell>
      <Suspense fallback={<BoardSkeleton />}>
        <ClientBoard /> {/* Fetches via useQuery on mount */}
      </Suspense>
    </DashboardShell>
  );
}
```

The client component would then fetch everything:

```tsx
"use client";

function ClientBoard() {
  const { data: board, isLoading } = clientApi.board.getHomeBoard.useQuery(undefined, {
    initialData: undefined, // Could be populated from Redis via API route
  });

  if (isLoading) return <BoardSkeleton />;
  return <BoardContent board={board} />;
}
```

### How Next.js ISR Works

- On first request, Next.js generates the page and caches it
- Subsequent requests serve the cached HTML instantly (TTFB ~0ms for CDN)
- After `revalidate` seconds, the next request triggers background regeneration
- The stale page is served until the new one is ready (stale-while-revalidate)

### PROs
- **Near-instant TTFB**: Static HTML served from disk/CDN cache
- **Reduced server CPU**: No React SSR on every request
- **Scalable**: Static pages can be served by any CDN or reverse proxy
- **Good for public boards**: Shared boards viewed by many users benefit most

### CONs
- **Layout shift (CLS)**: Dashboard appears empty then fills in — bad UX for dashboards
- **No SSR for SEO**: Not relevant for Homarr (it's a private dashboard app)
- **Slower perceived load**: Users see a skeleton for 200-500ms while queries run
- **Authentication complexity**: ISR pages must be the same for all users. Homarr's dashboard is user-specific (permissions, board access), making ISR caching ineffective for the page itself
- **Breaks existing hydration pattern**: The current `HydrationBoundary` + `dehydrate()` pattern works well and ensures no layout shift
- **WebSocket subscriptions delayed**: Real-time updates don't start until client JS loads and connects

### Benchmark Comparison (Theoretical)

| Metric | Current (SSR) | Approach 7 (Redis initial data) | Approach 8 (ISR + CSR) |
|---|---|---|---|
| TTFB | 200-500ms | 50-100ms | ~10ms (static) |
| Time to Interactive | 200-500ms | 50-100ms | 200-500ms (same) |
| Largest Contentful Paint | 200-500ms | 50-100ms | 400-800ms (worse) |
| Cumulative Layout Shift | ~0 | ~0 | 0.1-0.3 (worse) |
| Server CPU per request | High | Low | Near zero |

### Recommendation

**Approach 7 (Redis-backed initial data) is recommended over Approach 8 (ISR)** for Homarr because:

1. **Dashboards are personalized**: Board access depends on user permissions, making ISR page-level caching ineffective
2. **No layout shift**: Users expect the dashboard to appear fully rendered
3. **Existing infrastructure**: Redis + cron jobs already provide the cache layer needed
4. **Incremental adoption**: Can be applied per-widget without changing the overall rendering strategy
5. **ISR is designed for content sites**: Blog posts, documentation pages, product pages — not interactive dashboards with real-time WebSocket subscriptions

ISR could still be useful for specific Homarr pages like `/manage/about` or documentation pages that don't depend on user state, but the main dashboard is not a good candidate.
