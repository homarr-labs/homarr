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
