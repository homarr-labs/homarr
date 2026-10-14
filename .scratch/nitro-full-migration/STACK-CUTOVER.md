# Whole-repository stack cutover

## Latest user steering

The user requires a complete 1:1 frontend, explicit replacement of Next.js behavior, TanStack Query with the oRPC adapter, TanStack Router navigation/prefetch, appropriate Redis caches moved to Nitro KV, and a backend file structure decoupled from frontend runtime. Current concurrency limit is **32**, including implementation, audits, reviews and fixes. This supersedes the older35 cap; cancelled leases remain revoked.

An audit is not implementation or frontend parity. Current frontend remains partial. Existing accepted source ports are reused, not regenerated. Security sessions/authority/transactional state remain SQL-backed; Nitro KV is not assumed transactional or capable of CAS. Redis pub/sub needs owned same-listener delivery, not KV-shaped fake subscriptions. Preserve every feature, source layout, catalog and durable value while changing framework glue.

## Execution

Oracle approved this direction: release proven audit subsets into implementation rather than waiting for another whole-tree audit. A02 must freeze an exact relocation manifest before backend moves; A05 must release its retained source baseline before modifying old Widget components. Family declarations passed independent review (22 exports/19 dependency fields and matching lock workspace additions); five new Integration directories are now ready for explicit allocation. The oRPC Query adapter is still not declared by Nitro, so its exact pin/manifest/lock/install prerequisite must be resolved separately before executable use. Same-listener HTTP/SSE remains the production arrangement.

1. Parallel exhaustive file inventory/classification for every safe repository-owned file, with explicit coverage and skip reasons. Read text files; binary/static/generated/vendor assets receive metadata classification, not fabricated source inspection. Do not read real credentials/appdata or generated running output. Exclude node_modules/.git/external symlink targets from product migration; record those exclusions.
2. Reconcile each Next/tRPC/Redis dependency with a concrete replacement and existing target. Map route/loading/error/layout/metadata/redirect/image/middleware/server actions/hydration/prefetch individually. Query is not a substitute for Router or server HTTP semantics. Record uncopied source components and incomplete new features by file.
3. Independently review the new execution plan. Approved family declarations and minimal jobs consumer join continue in their exclusive scopes. Existing eleven family producers remain gated by declaration review; audits cannot reopen their source leases.
4. Delegate nonoverlapping implementation cuts: oRPC Query adapter/client query utilities; Router route/navigation/prefetch glue; Nitro KV cache adapter for appropriate caches; backend bootstrap/transport outside frontend; source component closure; exact Next/tRPC removal and deployment join. Concrete dependencies/contracts must exist before consumer implementation; no no-op/fake privilege/parser/provider bridge.
5. Assemble a disposable running application, then fix runtime failures in parallel. Run required lint/typecheck and relevant existing/native/browser/restart checks after convergence; crash-driven iteration does not replace data/security/browser parity validation. Keep real installations,3100 fixture and compiled3200 output unchanged.

## Backend direction to review

Verified API report is STACK-ADAPTER-APIS.md. Its missing-Query-dependency statement is a research snapshot predating the separately reviewed two-field declaration; that edge is now present. Other key version facts remain: actual oRPC createTanstackQueryUtils with prefix-scoped generated keys; Router loaders share QueryClient/options and defaultPreloadStaleTime0; installed Nitro uses nitro/storage useStorage, not newer useKV; fs ignores write TTL, so persistent raw caches require validated expiry/read-time miss handling. No security/CAS/pubsub migrates to KV.

A14 finished all46owned files in tasks/websocket/Workshop as safe text, mapping cron boot order, real SQL session cleanup, old WS readiness/auth, same-listener subscription replacement and deployment joins. This inventory is not an implemented backend. A17 completed metadata-only evidence/experiment classification; no product source acceptance follows. The pinned Query adapter direct dependency passed narrow review, but actual API/installed-resolution/application graph use still needs verification.

Separate browser application from Nitro backend runtime at the application directory/package boundary; `apps/backend` is the candidate backend root, while `apps/nitro` owns Vite/React/TanStack frontend. Shared client contracts/validation may remain package-owned but must not import backend runtime. Preserve the approved same-listener HTTP/SSE production semantics; decoupled code does not implicitly require separate hosts/listeners. Review asset serving/build/deployment and existing server-composition move before editing shared entrypoints. No backend relocation is authorized merely by this proposal.

## Exhaustive audit partitions

Every audit writes only its named handoff and per-file JSON under `.scratch/nitro-full-migration/stack-audit/`. It makes no product edits, does not inspect active mutable implementations as accepted dependencies, and does not launch tools/providers/runtime code. Query current git-owned file names including untracked product source. For each assigned path record inspected/classified/excluded, framework dependency, target path, preservation action and blocker; inspect safe text content before claiming inspected. Preserve hashes/catalog/assets without copying them into reports. Counts are coverage evidence, not feature acceptance.

| ID  | Exclusive inventory scope                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | apps/nextjs                                                                                                                                                         |
| A02 | apps/nitro                                                                                                                                                          |
| A03 | packages/api                                                                                                                                                        |
| A04 | packages/auth                                                                                                                                                       |
| A05 | packages/widgets                                                                                                                                                    |
| A06 | packages/boards,form,forms-collection,modals,modals-collection,notifications,onboarding,settings,spotlight,ui                                                       |
| A07 | packages/definitions,validation,common,translation,server-settings                                                                                                  |
| A08 | packages/core,redis                                                                                                                                                 |
| A09 | packages/integrations                                                                                                                                               |
| A10 | packages/request-handler,cron-jobs,cron-jobs-core,cron-job-status                                                                                                   |
| A11 | packages/db                                                                                                                                                         |
| A12 | packages/icons,image-proxy,ping,docker,analytics,workshop,cli                                                                                                       |
| A13 | packages/custom-widgets                                                                                                                                             |
| A14 | apps/tasks,websocket,workshop                                                                                                                                       |
| A15 | apps/docs                                                                                                                                                           |
| A16 | root files, .github,.run,.vscode,deployments,development,docs,e2e,patches,scripts,static-data,test,tooling,tools                                                    |
| A17 | .agents,.claude,.scratch,implementation,reports,research_notes,apps/nitro-experiment; metadata-only for temporary evidence and experiments, no production migration |

Docs/Go Workshop were previously excluded from replacement; now inventory them too and explicitly identify any scope conflict. Do not silently replace those services or alter docs architecture while app audit is running. User has not yet answeredQ16/Q17/Q18; affected production joins remain held, unrelated implementation continues.
