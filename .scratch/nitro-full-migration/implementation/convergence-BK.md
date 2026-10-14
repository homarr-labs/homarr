# BK — frozen source handoff

Scope frozen: only `packages/api/src/backup-runtime/nitro-join/{contracts,service,index}.ts`, `packages/api/src/backup-runtime/archive.ts`, `packages/api/src/backup-runtime/index.ts`, and this new report were written. No commands, checks, tests, native execution, mounts, consumer/fixture changes, or dependency changes were performed. Compiler/runtime/procedure acceptance is not claimed.

## Source changes

- Required `BackupJoinRequest` carries the original Request, binding signal, actual asynchronous authorizer and captured-currentness assertion. Each invocation freezes a local capture of these functions/references; signal composition includes binding, actual Request, optional operation signal and existing service lifetime. The trusted host must supply the genuine immutable admission closure; this interface does not manufacture authority.
- One service still owns one genuine `createSqliteCopyEngine`, active lifetime, retained identity map, preparation slots and byte reservations. Configuration no longer accepts a singleton authorizer. All byte/result/preparation operations, including held apply/export and discard, require a binding; phase/close remain host operations. Uploads can use only the captured binding Request.
- Authorization/currentness precede ingress. Existing copied-backup inner authorization uses request-local dependencies over that shared engine. Reauthorization/currentness follow awaited copy disposal and owned-input wiping, immediately before inspection/review or preparation publication. Newly prepared snapshots are wiped on unsuccessful publication; ownership and reservation transfer happen synchronously only after the final fence.
- Required validated `maximumReservedBytes` and `reservationBytes.{inspect,prepare,exportInspection}` have no defaults. Every charge is a safe integer, covers the conservative floor, and fits the explicit capacity. Capacity and preparation slots are reserved before upload reading or owned allocation/copy. Full preparation charges remain retained until snapshot wipe/discard/close; idempotent releases occur only after awaited physical work/cleanup. Protected review cloning also reserves an inspection charge.
- Reader accepts the compatible optional signal defaulting to `request.signal`. A listener is installed before the first read; one observed cancellation promise and pending read are settled before lock release. Header-limit/error/abort exits cancel unfinished input. Cancellation remains `cancelled`; cancellation or lock-cleanup failure takes precedence as `cleanup-failed`, reaching the existing failed/abort lifetime path. Checks bracket reads, form decoding and file-buffer materialization. Owned chunk copies, concatenated staging and unsuccessful output are wiped; borrowed stream chunks and caller byte inputs are never wiped.
- Root preparation tracks the sealed buffer until awaited disposal and post-disposal abort checking succeed. Every unsuccessful ownership transfer wipes it, including post-seal abort or disposal failure. Disposal and runtime reset each remain single calls; cleanup failure preserves its existing precedence over the primary failure.
- Preparation JSON now contains only the existing `applyReady:false` hold, not protected inspection data. The new bound `reviewSourceAsync` returns the existing review shape after retained-object identity and publication checks. Preparations remain server-only map keys, never browser-reconstructible handles. `downloadReady:false`, unavailable apply/export, and all route/UI/restore holds remain unchanged.

## Reservation coverage and limits

Let `M=backupLimits.multipart`, `C=backupLimits.compressed`, `A=backupLimits.archive`, `D=backupLimits.database`:

| Operation                                   | Validated minimum charge |
| ------------------------------------------- | ------------------------ |
| inspect, including upload                   | `4M + 3C + 2A + D`       |
| prepare, including upload and retained seal | `4M + 3C + 2A + 2D`      |
| export inspection                           | `2D`                     |

The conservative envelope counts overlapping owned chunks/concatenation, Response/form materialization, uploaded file output/service archive/parser input copies, decompression staging/output, copied-image allowance and an additional maximum sealed buffer for preparation. The unchanged actual copy engine checks snapshot size before reading the seal. These are byte-buffer reservation floors, not a claim about native SQLite allocations, JS object/string overhead, external caller/stream storage, process RSS, or interruptibility of synchronous ZIP/Buffer work. The host must choose explicit adequate capacity/charges and retain its own ingress, runtime and response resource policies; no guessed production capacity is supplied.

## Remaining required producers / holds

AH/host must issue the real association/deadline/principal-or-current-no-users-claim/generation binding, with origin/CSRF/demo denial before ingress, admin-only export, and appropriately narrow inspection/preparation policy. BP must select capacity/charges, own service lifetime/drain and enroll any inspection route with response budgets. Cross-request candidate ownership, expiry/discard supervision and genuine verification/fencing/replacement/recovery remain absent; preparation is not mounted. Export sanitization/sealing/download ownership remains absent; no raw-export fallback was added. Independent source review and coordinator-owned focused lint/typecheck remain pending.

## Focused diff

```diff
- NitroBackupConfiguration extends SqliteBackupConfiguration
+ NitroBackupConfiguration extends Omit<SqliteBackupConfiguration, "authorizeAsync">
+ BackupJoinRequest { request; signal; assertAuthorizedAsync; assertCurrentAsync }
+ maximumReservedBytes; reservationBytes: BackupByteReservationCharges
- createSqliteBackupDependencies(config)
+ one createSqliteCopyEngine(...) + per-operation bound BackupDependencies
- inspectUploadAsync(request, options?)
+ inspectUploadAsync(binding, options?)
- prepareUploadSourceAsync(request, options?)
+ prepareUploadSourceAsync(binding, options?)
- inspectAsync(bytes, options?) / prepareSourceAsync(bytes, options?)
+ inspectAsync(binding, bytes, options?) / prepareSourceAsync(binding, bytes, options?)
- discard(preparation) / applyAsync(preparation) / exportAsync(signal?)
+ discard(binding, preparation, signal?) / applyAsync(binding, preparation, signal?) / exportAsync(binding, signal?)
- inspectExportSnapshotAsync(input, signal?)
+ inspectExportSnapshotAsync(binding, input, signal?)
+ reviewSourceAsync(binding, preparation, signal?)
- SourcePreparation.toJSON() publishes inspection without an admission check
+ SourcePreparation.toJSON() publishes only applyReady:false hold
- readBackupUploadAsync(request)
+ readBackupUploadAsync(request, signal = request.signal)
- return prepared snapshot before finally-awaiting disposal
+ await disposal; check abort; transfer ownership; otherwise wipe sealed bytes
```
