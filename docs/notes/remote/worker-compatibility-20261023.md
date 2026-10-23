# Small worker and classic compatibility — 23 October 2026

The standalone worker is **119.79 MiB**, down from **122.85 MiB**: 3,212,774 bytes / 3.06 MiB / **2.49% smaller**. These are Docker-reported uncompressed image bytes. RAM was not remeasured; the [21 October measurements](worker-memory-20261021.md) belong to their original image and workload.

| Local image                   | Image bytes |    MiB | Deployment                                                 |
| ----------------------------- | ----------: | -----: | ---------------------------------------------------------- |
| `homarr:worker-mini-local`    | 125,604,788 | 119.79 | Independent encrypted worker; requires a separate frontend |
| `homarr:classic-compat-local` | 510,914,228 | 487.25 | Classic all-in-one dashboard, backend, proxy and Redis     |

Exact image identities, source hashes and sanitized runtime results are in [acceptance.json](../../../benchmarks/worker-memory/results/2026-10-23/acceptance.json). Both images were built locally on amd64. Neither was published or deployed over the existing demo.

## Changes

The worker-only assembly omits unused package source, documentation, coverage instrumentation, foreign-platform bcrypt binaries and native build headers. Both Linux architectures and libc variants remain packaged. DOMPurify/jsdom, genuine Undici, gRPC runtime/protos and the SSH JavaScript fallback remain intact. This removes about 3.50 MiB; preserving the optional Redis client closure adds back about 0.44 MiB, producing the net reduction above. The worker still defaults to in-process state and contains no Redis server, Next.js, Node or Nginx.

Classic validation exposed two startup problems: the lazy Redis loader used an ESM filename in Node CommonJS bundles, and its dynamic import hid the runtime dependency from assembly. The loader now creates its require only when selected, with the correct runtime filename. Assembly includes ioredis and its dependencies, and classic migrations receive the same module path already used by the CLI.

A real board edit exposed a frontend regression shared by classic and worker modes: each `useUtils()` render created a new proxy, causing BoardProvider cleanup to invalidate/refetch and overwrite unsaved changes. Memoizing by API client and QueryClient identity fixes that lifecycle. Switching clients still replaces the utilities. The exact failing flow was repeated against the rebuilt production frontend: seven items → remove Weather → save → reload → six items, including after container restart and returning password login.

## Focused validation

- Tiny image: fresh SQLite readiness; encrypted owner claim/bootstrap; native private-board create/list/read and layouts; four forged/raw private requests denied with 404; saved grant and board survived restart; reused claim denied. Captured transport frames contained none of the fixture's private payload strings. This smoke check does not constitute a cryptographic audit.
- Packaged dependencies: bcrypt hash/compare, actual SVG sanitization, genuine Undici HTTP request, Docker/SSH/PostgreSQL/gRPC module loading, and optional Redis PONG. PostgreSQL module loading here is separate from the [earlier live PostgreSQL validation](../native-workers/architecture-followup.md).
- Classic image: fresh nonroot onboarding; local administrator creation; normal dashboard; real saved widget removal; native oRPC and legacy tRPC HTTP/WebSocket queries; anonymous protected calls return 401; Node CLI succeeds. Account, session and edited board survive recreation/restart. Logout denies protected access; username/password login restores it. No browser page errors.
- Existing focused tests passed: `apps/nextjs/src/proxy.spec.ts` (12) and the registration cases in `packages/api/src/router/test/user.spec.ts` (4, 12 unrelated cases skipped). The later utilities fix was validated by the failing-then-passing actual-image flow. Changed-file lint/format/syntax checks passed; no tests were added and no full suite ran.
- Independent Standards and Spec source reviews found no outstanding material issue. The utilities fix received another independent review. Arm64/glibc execution, configured provider workloads, long soaks, and existing-install migration/rollback were outside this pass.

## Deployment choice

Build the worker with `docker build -f apps/backend/Dockerfile -t homarr:worker-mini-local .`, then use the [worker launcher](../../../deployments/worker/README.md). The root `Dockerfile` still defaults to the all-in-one `runner`; `docker build -t homarr:classic-compat-local .` builds that path. The server-only legacy bridge remains available for old clients; the normal frontend uses native oRPC.

The significant change is architectural: a complete headless integration/widget backend can run independently while the normal Homarr frontend runs elsewhere. This pass's size reduction is modest. The 119.79 MiB worker is not a direct replacement for the all-in-one image: it deliberately needs that separate frontend. The classic image retains the familiar deployment shape and now has fresh local runtime evidence.

Opt-in testing is appropriate. Before replacing an existing installation, validate its backup/key restore, upgrade and rollback against the candidate image. A public hosted service additionally needs its intended OAuth configuration, operational/security review, quotas and realistic workload validation. No live GitHub sign-in or production cutover was attempted. The wider feature history and existing release-validation limits remain in [architecture follow-up](../native-workers/architecture-followup.md) and [test audit](../native-workers/test-audit.md).

Disposable QA containers, volumes, private credentials and browser sessions were removed after capture. Verified local images and sanitized evidence remain; user data and running demos were preserved.
