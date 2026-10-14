# BK types/cleanup — frozen handoff

Written scope: `packages/api/src/backup-runtime/archive.ts`, `packages/api/src/backup-runtime/nitro-join/service.ts`, and this new report only. Read `WRITER-RULES.md`, the frozen `implementation/convergence-BK.md` handoff, exact source, and the supplied owners/lint logs in `TEMP/nitro-convergence-next-1tPGwLQS`. No commands, checks, tests, installs, native/SQL execution, mounts, dependency changes, or nested agents were performed. Compiler/runtime/procedure acceptance is not claimed.

## Mechanical changes

- Pending reads use `ReturnType<typeof reader.read> | undefined`, retaining the actual read promise. The awaited result is inferred; the done branch exits before accessing its value.
- Multipart staging is an owned `Uint8Array<ArrayBuffer>` allocated with `new Uint8Array(size)` and populated directly from the owned chunks. No intermediate concatenated Buffer, extra unwiped copy, or BodyInit assertion was introduced.
- Upload operation failures are captured in a failure wrapper; export inspection uses a tagged success/failure outcome. Thrown `undefined`/`null` are failures, not success sentinels. Existing error mapping is retained.
- The three upload cleanup throws and the export-copy disposal throw flagged by the supplied lint log are replaced with recorded cleanup failure. Return/throw selection occurs outside finally: `BackupError("cleanup-failed")` overrides an operation failure; otherwise the original mapped operation error remains.
- Upload cancellation still starts before awaiting physical settlement of both cancellation and pending read. Listener removal, owned body/chunk wiping and reader-lock release remain; unsuccessful output is wiped on operation failure, cleanup failure or final abort. Borrowed stream chunks and caller inputs remain untouched.
- Export copy disposal is awaited before returning the review; the owned input is wiped before the helper settles and the outer reservation remains held through cleanup and final admission/currentness fences.
- Sealed-buffer tracking/wiping, input-domain validation, request-bound copying, global reservations and preparation retention remain unchanged. No restore/apply/export activation or retry was added.

## Exact remaining required producers / holds

- AH/host: genuine immutable association/deadline/principal-or-current-no-users-claim/generation binding; origin/CSRF/demo denial before ingress; admin-only export and narrow inspection/preparation authorization.
- BP: explicit adequate capacity/charges, service lifetime/physical drain ownership and inspection-route response budgets.
- Cross-request candidate ownership, expiry/discard supervision and genuine verification/fencing/replacement/recovery remain absent; preparation remains unmounted.
- Export sanitization/sealing/download ownership remains absent; no raw-export fallback. `applyReady:false`, `downloadReady:false`, `production-restore-join-unavailable`, `export-sanitization-unavailable` and existing route/UI/restore holds remain.
- Independent source review and coordinator-owned focused lint/typecheck remain pending. Supplied logs describe the pre-patch source; no post-patch acceptance is asserted, and unrelated owners/lint diagnostics were not changed.
