# Native runtime driver — minimal repair plan, report only

## Status / bounded allocation

**PLAN ONLY; supervisor remains HOLD.** Coordinator-supplied premises: native-consumer axis SOURCE ACCEPT/no findings; supervisor has the three findings below; focused noEmit/lint numeric1/1 and two no-cause warnings remain preserved. Fifth-artifact read-only byte collection and owner/context review are active. No acceptance, source lease, compiler rerun, initialization, launch or failure policy is granted here.

Only this new report is written. Native TEMP sources, source-freeze images/records, product sources, compiler inputs and existing evidence remain unchanged. No commands/checks/hashes/build/evaluation/import execution/native SQL/environment/configuration/data/secrets/network/container/nested-agent actions occurred. The previously approved launcher **source** was read, not imported/executed; no old result, resource or approval was consumed as new evidence.

Prospective allocation, **only after separate release**:

| File                                                          | Exact permitted delta                                                                                                                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TEMP/nitro-native-runtime-driver-t_05t8qe/author/driver.mts` | At current150, mechanically change generic arrow `<T>` to `<T,>` for TS7060. No body, operation, observation or consumer change.                                                |
| Same `author/host-launch.mjs`                                 | The three lifecycle/stop/evidence fixes below, within this existing supervisor. No second launcher/framework/helper, new public API, alternate source owner or driver callback. |
| `packages/db/main-target-catalog.ts`                          | **Separate held product scope**, after fifth static proof/source-freeze hooks finish and explicit approval: one variable type annotation at176 only, described below.           |

`tsconfig.json`, strict options, exports, schemas, migrations/assets and private ownership APIs are excluded. Do not chase the no-cause warnings or add comments/tests/casts/ts-ignore/defaults. Preserve primary-first aggregates and original diagnostics; no warning-only changes at host111/133.

## Reuse anchors: accepted HOSTSOURCE patterns, not its launch/resources

Coordinator disposition: Native/parser/K/provenance reviewer ses_ecde97a6bffeX8t16q9PVdb2uy PLAN APPROVE; supervisor reviewer ses_ece745d66ffe8YruU1v89Wrgqk conditional PLAN APPROVE for two TEMP repairs only. Coordinator releases only author/driver.mts parser comma and author/host-launch.mjs three repairs plus named repair handoff. Current source images/red receipts remain immutable. K annotation remains separately held until fifth artifact static packaging proof/review and source hooks finish. START settlement, admitted namespace/runtime contract and independent filesystem hard-wall owner remain mandatory later launch prerequisites; no compiler/materialization/init/context/failure-policy execution is released.

Read source: `TEMP/nitro-schema-snapshot-id-wTek86tz/records/launch-schema.py`.

- `Docker.call:623–709` retains each actual client invocation/status/failure and real reap state, including unreaped records. Notification/timeout is not completion.
- `security:739–902` checks actual admitted private `PidMode`, supported runtime, restart disabled, healthcheck disabled and exact context confinement. These are prerequisites, not a caller-produced “no children” callback.
- `state_receipt:905–927` distinguishes actual stopped facts, exit/OOM/error state and timestamps. `main:1201–1243` retains start-attempt state, physically settles the actual starter, then validates post-stop facts and elapsed bound; successful started execution requires **exited**, not merely created/Pid0.
- `shutdown:930–984` separates signal dispatch, bounded wait and inspection, requires wait/inspect agreement and retains each failure; force never becomes clean success. `note/persist:580–605` buffers bounded evidence until actual stopped state and no live client.

Reuse those ownership/order/checkpoint rules inside the existing MJS supervisor. Do not copy its CLI, old IDs/approval/pins, fresh per-phase durations, daemon-info call or historical resources. The new attempt must use its own original wall/monotonic caps and already-admitted Engine API context; these source patterns are not new runtime evidence or permission to replay metadata migrations.

## P1-1 — termination intent survives a pending original START

Current host622–631 consumes `forceDispatched` **before** inspection. At cutoff, an original START can still be pending while inspect sees created/nonrunning. No kill is sent, but the flag permanently disables later force paths; the original START may then launch. This is a real ownership race, not a logging defect.

### Minimal state split

- `terminationIntent`: absent / requested, with original reason and cutoff observation. Publish intent synchronously before any awaited inspection; it immediately closes all future CREATE/START admission.
- Retain the **original** CREATE and START task records: not-dispatched / pending / physically settled, plus dispatch claim and actual transport outcome. Keep an independent **daemon outcome**: accepted / definitely rejected / ambiguous. HTTP close or request cancellation alone cannot produce accepted/definitely rejected.
- `kill`: unclaimed / dispatch-claimed / sent-outcome-unknown / confirmed / rejected. Claim only immediately at the actual owned kill dispatch boundary, never when reading a created/nonrunning state. Once any kill POST may have been sent, no second kill/retry.
- One memoized termination reconciliation task, published before deferred execution. It depends on original starter/creation records, not the main supervisor promise, itself, all requests indiscriminately, or an Engine wait that needs that task's kill to complete.

### Required order

1. Before the sole START dispatch, recheck the **intent**, original work bound and exact ownership—not the old kill flag. Preserve the once-lock and original source claim. An unstarted branch after intent cannot start later.
2. If cutoff occurs while START is already dispatched, keep intent pending. Settle/reconcile that exact original task; do not dispatch another START or retry an ambiguous POST. A created/nonrunning read while it is pending is only an observation, **not** closure or consumption of the kill slot.
3. After authoritative original START acceptance, perform the owned same-id inspection. If running, claim/send one owned kill under the separately approved original force policy; if already exited, retain that fact without claiming a nonexistent kill dispatch. Both paths still require actual bounded wait/inspection and task/writer closure.
4. Reuse an already retained normal wait where appropriate; if policy needs a separate read-only closure wait, admit at most one, within the original reserved bound. No polling/retry loop or new relative deadline. Require wait exit code and subsequent exact-id inspect state agreement. Request completion is recorded separately from stopped state.
5. Every force/inspection/wait fault is retained. Primary remains the first real failure; cleanup cannot replace it or convert force into PASS. Intent, sent kill, accepted kill and confirmed physical stop are distinct output facts.

**STOP-START-SETTLEMENT:** an aborted/lost START response can leave the daemon operation ambiguous even after its HTTP task closes. If authoritative completion/no-future-start cannot be established within the original bound, retain operational HOLD/unknown stop, consume the attempt and never claim no future writer. An observation of created or exited cannot resolve that ambiguity by itself. A stronger daemon-command settlement/containment primitive, if needed, requires separately approved API/scope/failure-policy work; do not invent it or add a fourth helper. No launch is released by this plan for that unresolved case.

## P1-2 — replace impossible stopped `/top` with supported closure facts

Current host795–807 asks `/top` for a successful empty inventory **after** exited/Pid0. Engine `/top` requires a running container; that predicate makes clean completion fail. Remove that requirement under the future host source lease. A `/top` error must **never** mean empty processes.

The proposed no-children proof is a conjunction, not a new verifier:

1. The separately admitted Linux Engine/runtime contract genuinely supplies a **private PID namespace** for this exact context. Retain actual pre/post `HostConfig.PidMode === ""`, supported runtime and confinement facts, rather than trusting a promise flag. Apply the necessary existing HOSTSOURCE predicates to the already-used inspect response: no PID sharing/privileged escape, no restart, no healthcheck/alternate process producer, exact owned execution/mounts. If image defaults leave healthcheck possible, explicitly disable/validate it in this same host file; no child/native-source change.
2. The controlled source has only its one original starter, no exec/restart/retry/second START, no other admitted context writer. All original starter tasks have authoritative settlement; termination reconciliation/kill/wait/inspection tasks are physically settled. Receipt/context review must establish exclusion of external context writers; an id/name alone is not that proof.
3. The actual normal Engine wait has a valid exit outcome and the subsequent same-id inspect says **exited**, Running/Paused/Restarting/Dead false, Pid0, numeric exit matching wait, no OOM/daemon error and genuine completion timestamps. Created is only valid for a **never-started, definitively unstarted** cleanup branch, never native success.
4. Under the admitted Linux private-PID-namespace contract, termination of that namespace's init closes its descendant tasks; there is no host-shared descendant population left for a later starter/exec to revive. With (2)–(3), this supports **owned context namespace closed/no surviving context tasks**, not a fabricated measured zero-row `/top` inventory or a claim about unrelated host processes/listeners.

Use an evidence label such as `basis: "admitted-private-pid-namespace-and-settled-writers-and-engine-wait-inspect"`; retain each premise and distinguish namespace-derived closure from direct process enumeration. Native strict close still comes from the accepted child result, not this Engine conjunction. Kernel namespace semantics plus the reviewed actual Engine/runtime mapping are required; `PidMode`/not-running alone does not suffice.

**STOP-NAMESPACE-CONTRACT:** prior HOSTSOURCE checks show the applicable ownership/confinement pattern, but do not themselves measure the new Engine/context. Independent host reviewer must accept the exact namespace/runtime/no-future-writer contract before source repair acceptance can become launch eligibility. If existing receipt/inspect facts cannot establish it, identify the minimal missing contract/evidence/API first and keep HOLD. No daemon inspection, `/proc` probe, extra verifier/callback, old-context replay or additional source allocation occurs here.

## P2-3 — original total wall includes stop and evidence completion

Current host777 clears the timer before stop verification; host847 then awaits open/write/sync/close without a deadline checkpoint. A late file operation can complete after the original wall and still return a passing result.

Repair within this file:

- Keep independent supervision active through original task reconciliation, physical stop verification, bounded evidence staging and **actual evidence file close**. The termination cutoff publishes intent independently; a separate total-wall expiry state closes all remaining admission. Both use the original admitted wall/monotonic roots, never a fresh finalization budget.
- Buffer bounded sanitized child/outer facts using the accepted note-before-persist pattern. Persist only after actual stopped state plus starter/writer/task closure. Avoid the current success-path child file write while physical stop is still unconfirmed.
- Track each evidence operation as not-dispatched / pending / physically settled-fulfilled-or-rejected. Use original bound checks before open, after actual open/write/sync/close settlement, before result acceptance and immediately before return. A synchronous return decision also checks elapsed wall/monotonic time even if a timer callback has not yet run.
- `writeExclusive` retains first write/sync failure and close failure in primary-first aggregate order. Deadline state is an additional failure, not permission to throw away the actual file task/close result. No `Promise.race`, timed notification or abort flag is reported as physical file-write settlement; filesystem operations are not claimed interruptible.
- Keep written outer evidence **provisional/checkpoint evidence**, not a self-certifying final PASS that could be written late. The final accepted verdict can occur only after those exact writes/syncs/closes settle and the original bound is checked. Do not overwrite an already written file to repair late evidence. Any separate final acceptance capture must be part of the existing, explicitly reviewed caller/evidence envelope; no hidden new helper or new output scope is assumed.
- Publish force-task identity before dispatch and join that task only from the owning finalization path. Timer callbacks do not await themselves or the main/finalization promise. Drain original starter dependencies before stop, then finite stop requests, then finite evidence tasks; do not mutate pending task records into fulfilled ones on expiry.
- Clear timers only in the outermost final disposition **after** all actually initiated tasks/evidence have physically settled and a final bound check has fixed success/failure. The same original deadline continues to apply on rejection paths; expiry cannot authorize new file/context work.

**STOP-FILESYSTEM-HARD-WALL:** a JS timer/checkpoint can reject _acceptance_ after expiry but cannot guarantee a stalled filesystem operation completes within the wall. Launch requires the separately reviewed existing outer hard-wall/failure envelope to own any still-pending host I/O and preserve unknown/incomplete evidence. If strict physical host reaping requires another process/helper or a new force policy not available in this two-file allocation, stop and identify that missing authority instead of introducing unbounded finalization or calling a raced notification “settled.” No policy amounts/actions are approved here. Cooperative/force/total policy remains **UNKNOWN_UNAPPROVED**.

## Separate K strict-index-flow annotation — product scope remains held

Focused profile inherits `tooling/typescript/base.json:19` **`noUncheckedIndexedAccess: true`**, unlike the coordinator-reported strict-only Backend/owner profiles. Actual K code at399–401 obtains `primary[0]`, rejects missing key and then accesses `key.columns`; at405–423 it obtains a Record-indexed `appReference`, rejects absence and then writes its action/form fields. The current reject declaration at176 annotates the arrow's return, but not the variable's callable type; the supplied TS18048 diagnostics show that this profile does not recognize those standalone reject calls as terminating flow.

Prospective exact one-line change:

`const reject = (): never => {` → `const reject: () => never = () => {`

Keep the identical function body/Error, every runtime guard and every caller. This changes type-level control-flow recognition, not accepted catalog/schema/SQL or physical admission policy. It is **not implemented** and is not a promise of compiler0. No relaxed profile, added optional checks/casts, non-null assertions, schema fabrication, tests, comments or public export changes.

### Freeze / post-fix provenance sequence

1. Complete and independently accept the currently active fifth-artifact byte/source/owner/context proof and its source-freeze hooks **before** any K mutation. Do not race collector input reads or reinterpret historical checks. Keep the fifth artifact, input manifest, emitted bytes and source facts immutable and labelled with their actual original generation.
2. Obtain a separate one-line K source lease; prospective TEMP fixes likewise need their own exact source lease. Preserve current native source images and red noEmit/lint evidence; coordinator creates a **new** repair freeze/delta/receipt generation rather than replacing either.
3. After repair freeze/review, separately release focused noEmit/lint against the unchanged strict profile, binding both repaired TEMP files and the newly annotated K input in new evidence. Compiler0, if observed later, would belong to that post-fix generation only. Keep warnings distinct; no warning churn is authorized.
4. Any future native driver compilation/materialization requires a new reviewed resolved-input inventory/metafile/closure/source-output association incorporating the new K source bytes. Even an erasable type annotation changes source identity. Do not patch the fifth artifact's manifest in place, reuse its original source fact as current, or claim emitted-byte identity without separately authorized measurement/review.
5. The fifth artifact may remain valid **for its original frozen source**. Claiming an artifact built from post-K source needs an explicitly reviewed new compiler/provenance result (or a specifically reviewed measured source/output bridge); neither a presumed type erasure nor the old static PASS grants that bridge. No build/native/runtime permission follows from this plan.

## Independent review checklist / unchanged consumer

- **Host axis:** intent cannot be consumed by a read; original pending START cannot escape the reconciliation path; ambiguous commands are never retried or mislabeled settled; kill dispatch once; wait/inspect/namespace/writer closure is real; total wall covers actual evidence completion; primary/cleanup/task/physical-stop facts remain distinct.
- **Native/strict axis:** only `<T,>` dispatch syntax and the separately held explicit callable-never annotation; no accepted consumer body/profile/root/read/write change. Genuine memory owner, no logger/seed, original epoch/adoption/observation operation/resource clocks, one batch1, one tracked domainLIMIT2/metaLIMIT3 unit, actual true readiness before/after and physical initialization/adoption/close drains stay unchanged.
- **Authority:** exact two TEMP source files plus separately approved K one-line annotation only later. Three supervisor findings and strict diagnostics remain HOLD/red until fresh independent source review and separately released checks. Empty-memory scope, file/populated/restart/adoption/production/browser/Node/PG/cutover/restore holds remain. No implementation or new migration authorization is granted.
