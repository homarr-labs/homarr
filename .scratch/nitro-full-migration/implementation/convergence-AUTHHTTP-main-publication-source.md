# AUTHHTTP original-bounds publication — dormant source freeze

## Status and exact lease

**Implementation frozen for two independent source reviews and coordinator-run fresh checks. Not source acceptance, mounting or runtime approval.** Both amended plan approvals and the accepted uncapturable-admission edge are coordinator-supplied prerequisites. Backend4's accepted `AUTHHTTP-BACKEND4-1` four-zero result and Auth5/Native6/K4/D2 pins were supplied, not reproduced.

Only these product files were edited:

1. `packages/contracts/src/contribution.ts`
2. `apps/backend/src/server/application.ts`
3. `apps/backend/src/server/runtime-composition/contracts.ts`
4. `apps/backend/src/server/runtime-composition/native-main-persistence.ts`

This new source handoff is the only report write in the implementation stage. Coordinator before-images: `TEMP/nitro-auth-publication-source-n2p1epy2/source-before.json`. No commands, checks, tests, hash helpers, evaluation, native SQL, config/env/data/secrets, dependency changes or nested agents were used. Backend/contracts manifests were read before using their existing imports; additions otherwise use built-in language/runtime primitives. No comments, casts, non-null assertions or explicit any were added.

`request.ts`, Auth capture resources, Auth HTTP selector/cancellation module, private RPC implementations, runtime/assembly/compose/startup/host/entry, UI, barrels/manifests and migration/configuration files were not edited. No controller construction call, descriptor enrollment, listener, bootstrap, native invocation or runtime-state change was performed. **Producer is dormant.**

## Types and genuine ownership seam

contribution.ts exports the approved cause/settlement-failure/terminal types, abandonment exclusion, handle and required producer interfaces. Terminal states are published with bodyless/head/eof boundary, abandoned, cancel-failed and settlement-failed with nonempty failures. ApplicationOptions gains only optional **enrollment selection**: absent/disabled preserves the generic path; enrolled requires exact route objects and both producer methods. There is no optional publication guard or new RequestContext/private-hook authority.

Backend AuthHttpController extends that producer and keeps its existing handle method. Genuine MAIN returns `assertAuthHttpController` alongside its existing dormant constructor. Its owner-local controller WeakMap retains the actual constructor's owner/issuer/request/SQLite-currentness closure; structural copies/foreign controllers cannot pass. Required future assembly wiring is the actual validated controller itself as producer and each descriptor's handle equal to that controller.handle, not copied structural functions. This stage deliberately does not add that mounting call.

MAIN retains exact context/captured quartet plus principal, pre-execution bounds, response-source classification and a reservation on the real completion-keyed/context record. Response-source distinguishes genuine local rejection, actual released issuer response, actual held response and a captured failure response. Publication lookup verifies completed handler/result identity, final mapped Response and original saved bounds; released/held/local classifications are checked against actual executor/selection settlement. Canonical native executor outcome is unchanged and remains private; no acknowledgment or native success is invented for local output.

## Original capture and admission edges

For every known-path returned output, MAIN obtains genuine getHttpRequestBounds **before** preflight/native execution, including local 405/disabled-provider 404. The pure selector still precedes body/Core/native work. Saved effective deadline/signals/resource lifetime are retained; no getter after renewal/logout, old-lease read, reauthorization, replacement principal or deadline reset.

Closing/non-ready/repeated-context entry rejects without allocating an unbound Response. Failure before original bounds capture also rejects the registered handler after its bookkeeping/owned-output cleanup. The existing application catch owns sanitized500/499 and disposal. Normally captured 405/404 and genuine held503 retain their existing mapping; there is no unbound controller503, null-success or fake reservation at an uncapturable edge.

Handle assertCurrent uses only its real private registration, captured context/principal/quartet, real owner/current identities, existing retirement-safe assertHttpRequestCurrent, saved configured/wall-clock deadline and original joined lifetime. It never reads an invalidated old session lease after renew/logout. MAIN/request-resource/request-operation lifetimes are joined without a timer; kernel adds its own actual request/application signal.

## Pre-handler reservation and physical ownership

The handler-only finalizeHandler wrapper executes **outside execute's catch/remapping/finally**. After final mapped selection and physical abandoned-output cleanup/skipped-task bookkeeping, it creates exactly one reservation completion, attaches the final mapped Response and adds the completion to the strong reservation set **before the handler's existing completion resolves**. Only then does it mark the real response handed off. It does not reserve an old native response then return an unregistered replacement503.

Reservation phases are reserved → claim-unwind or awaiting-first-check → checking → terminal. A handle WeakMap associates a real frozen handle with that same reservation. Claim allocates no completion/task and makes no owner-readiness exception: it can attach to an already aborted owner's genuine existing reservation for abandonment, but its first check denies publication. Unclaimed/delivery-fault finish and claimed finish settle that same completion. First terminal is frozen/recorded; the same terminal identity is idempotent and another terminal cannot overwrite it. Finish performs no currentness/native/disposal/close operation or await.

Pre-handoff reservation failure retains its own error separately from an earlier handler failure, cancels/drains the exact still-owned final mapped output through the existing registered cancellation task/helper, settles any partial reservation with non-published terminal, then rejects delivery. It creates no second response, native retry or claim-time completion. Once successful delivery occurs, MAIN never reacquires/cancels the response; kernel exclusively owns the physical reader/cancellation path.

MAIN close denies admission and aborts actual MAIN lifetime first; after existing initialization/operation/fixed drains it awaits **Auth HTTP handlers, then snapshots/drains their outstanding reservations**, then runs existing Auth requests → issuer → helper/native cleanup. Reservations created while handlers finish are therefore included. Claim cannot add an unseen post-snapshot task. Cancel-failed/settlement-failed terminals contribute real private cleanup aggregates; normal owner/request abandonment does not imply failed native SQL. Actual native outcome and original/cancellation errors stay distinct.

## Existing kernel loop integration

Local helpers `publicationReason`, `abandonedPublication`, `publicationSettlementError` classify real physical outcomes; they do not grant authority. ResponseSource and RetainedPublication are internal discriminated modes, not public replacement callbacks. The existing private registration and async assertion bodies are unchanged. Existing generic response/disposal semantics remain in their explicit generic branch.

- respond takes ownedResponse before claim and stores the delivered handle before shape/currentness/listener work. Claim/delivery failure retains the original context/Response for required unclaimed unwind after physical discard.
- Existing finalize/header/body transport semantics remain; no Auth byte buffering, cookie effects, CSRF rewrite, profile transformation, body clone or second stream layer was added.
- retainRequest still creates one reader and its existing highWaterMark-zero wrapper. Kernel cancellation is made reachable immediately after acquiring the reader, before reader.closed/listener/stream/Response construction can fail. The termination promise is registered before its deferred physical work can reenter.
- Physical finish drains cancellation, real pending read/private-check promises and reader.closed, releases the lock and records the genuine terminal before request disposal. Actual physical rejections are classified/aggregated, not treated as success because Promise settlement completed. The drain never includes the pull/finish/receipt/disposal operation consuming it.
- Never-returned retained body, wrapping failure, abort, consumer cancellation, read/check/enqueue failure, finalization failure and claim unwind use that retained ownership path. A locked/used pre-retention body is a retained contract fault; no competing reader is created.
- Enrolled chunks get the final synchronous original-bounds check after the last await immediately before enqueue. EOF physically settles reader/check/closed/lock work, then checks synchronously, closes the outer stream, records terminal and only then starts disposal. EOF cancellation racing physical finish remains abandonment, not published EOF.
- Enrolled bodyless/HEAD performs all preceding async work, including original HEAD discard, then the last synchronous check and published terminal before response commitment/tracked cleanup. No disposal await or check of a retired capture follows the final commitment. HEAD cancellation failure records non-published terminal.
- Generic/private bodies retain their original async checking and dispose-before-return/EOF-close ordering. Both modes share physical reader accounting, not Auth authority.

Terminal success/failure recording precedes outer onDispose; cleanup stays under the existing application-active accounting. A terminal-recorder contract failure is not silently disposed as successful publication. Handler/executor do not await outer body/disposal; synchronous recorder never awaits its own reservation or MAIN.close. MAIN's actual abort reaches the kernel even for an unpulled retained body. **No proactive idle-deadline timer/guarantee was added**, and published means application boundary, not remote network delivery.

## Exact surface retained, not mounted

Application construction reserves the managed `/api/auth` handler surface: disabled/absent enrollment rejects such descriptors, while unrelated phase-auth routes, generic `/api` asset404, root/render and existing nonmanaged consumers are not broadly banned. Enrolled mode validates exact descriptor membership/identity, uniqueness, common handle, phase auth, descendants false, public access and mandatory producer; selected pass is a contract fault, not fallback. Enrolled descriptor/access objects are frozen after validation.

The validated set remains **nine exact paths / eight legacy action kinds**:

| Path                             | Existing selector methods |
| -------------------------------- | ------------------------- |
| `/api/auth/providers`            | GET                       |
| `/api/auth/csrf`                 | GET                       |
| `/api/auth/signin`               | GET                       |
| `/api/auth/callback/credentials` | POST                      |
| `/api/auth/callback/ldap`        | POST                      |
| `/api/auth/signin/oidc`          | POST only                 |
| `/api/auth/callback/oidc`        | GET, POST                 |
| `/api/auth/session`              | GET, POST                 |
| `/api/auth/signout`              | POST                      |

No descriptors are installed in this stage. GET OIDC signin remains 405/Allow POST via the unchanged selector. Provider gating, canonical host/origin/empty-basePath construction, forwarding-header/original-Request checks and private RPC permission/publication contracts are unchanged. Anonymous product RPC membership remains the existing two settings leaves.

## Review/check handoff and remaining holds

Please independently review (1) original-capture/owner/response provenance, required binding and unavailable-edge rejection, and (2) pre-handler final-response reservation, every early physical-terminal path and handler→reservation→Auth close ordering. Then coordinator runs the freshly authorized backend/nitro/contracts/owners compiler checks and focused lint; no result is claimed here. Any failed check/review requires a newly coordinated repair/freeze, not mounting around a failure.

Separate runtime.ts/assembly.ts enrollment remains held until source acceptance and required fresh checks zero. Native Auth execution, file-backed adoption/provenance, K validator behavior, App/client/browser compatibility, PostgreSQL/Node support, production data and runtime/network actions remain independently unproved/unreleased. No ready flag, DB bootstrap/adoption, hash/grant/account mutation or portable-hosting workaround was introduced. Preserve the one-artifact/listener target and all prior safety/adoption holds.
