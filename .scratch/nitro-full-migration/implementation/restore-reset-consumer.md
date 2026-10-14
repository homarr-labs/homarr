# J2 preparation reset consumer — frozen for independent review

## Exact source delivery

Consumes Oracle-approved J2 in `BOUNDED-CONSUMER-JOINS.md` and the reviewed P3 producer described in `stage-p3-isolated-reset.md`. Historical “awaiting review” wording in that producer handoff does not override the current dispatch's source acceptance; no native/compiler/output proof is inferred from acceptance.

Only `packages/api/src/backup-runtime/contracts.ts`, the preparation call in `index.ts`, and this handoff were changed:

- `BackupEngine` now requires `resetRuntimeAsync(copy: CopiedDatabase, signal?: AbortSignal): Promise<void>`, structurally matching the genuine producer's operation.
- `prepareLegacyBackupAsync` awaits `dependencies.engine.resetRuntimeAsync(copy, options.signal)` on the **same owned copy**, after target ciphertext/reference/selected-board validation and copied SQL logout, before sealing. Existing pre-seal cancellation check now precedes reset; a second check follows reset. Post-seal cancellation and `finally` disposal remain unchanged.
- `sqlite.ts` needs no edit: its existing direct typed assignment `const engine: BackupEngine = createSqliteCopyEngine(...)` already retains the genuine method. API's existing `@homarr/db` dependency and the root's actual `createSqliteCopyEngine` export were verified by source reads. No cast, method translation, callback/controller or alternate engine was introduced.

No reset SQL, epoch generation, extra copied-resource method, external-validation attestation, error code or public DTO was added. The producer owns its WeakMap/phase/catalog/transaction gates and internal epoch; the consumer supplies only its actual copy and signal. The producer's `ready` phase does not attest external crypto/reference/logout checks: those remain the real caller's ordered responsibility.

## Preserved execution order and failure boundary

1. Current injected authorization, bounded actual archive parsing, isolated copy ownership and authoritative compatibility/catalog/ledger check.
2. Actual SQL migration, followed by source reference validation.
3. Source key validation and transactional decrypt/validate/rekey of every six-column ciphertext family, including same-key validation.
4. All five existing content transformations through the actual engine.
5. Target-key validation of every ciphertext family, reference validation, inspection and selected-board validation.
6. Existing copy logout transaction removes SQL sessions, verification tokens and obsolete onboarding claim.
7. Cancellation check → **await actual engine reset on that copy** → cancellation check.
8. Actual seal/close → existing post-seal cancellation check → prepared server-only snapshot; existing `finally` disposes the copied resource.

Reset rejection exits before `sealAsync` or successful prepared handoff. Existing outer catch preserves `BackupError` and maps other errors to fixed `invalid-database`, without raw SQL/crypto/producer causes. A producer abort rejection during reset follows that same sanitized outer mapping; an observed abort at explicit consumer checks yields `cancelled`. Cleanup failure retains the existing `cleanup-failed` rejection and cannot return success. No automatic reset retry, postcommit rollback assertion or live adoption occurs.

Current target50 requires genuine reset before seal. P3 validates the catalog and clears only four runtime tables, retaining a privately generated fresh epoch for seal-time content checks. This consumer does not weaken those gates or fabricate their outcome. Inspection and export algorithms are untouched and do not acquire reset/apply authority.

## Compatibility and fixture gaps

No inventory was rerun or modified: accepted historical conservation evidence remains **40 domain families, 43 populated source fixture rows, six ciphertext columns and original 49-entry source ledger**. Archive/crypto/reference/inventory/media/bcrypt/SuperJSON algorithms and source assets were not edited. Current target50 output needs the separately reviewed appended-prefix/catalog/reset/reopened-output assertions; historical target49 proof is not a new target50 pass.

The existing `restore.test.ts` `engineFixture` forwards `createSqliteBackupDependencies(...).engine` directly. Its fault decorators retain that engine object and override only the existing fault seam. No independent fake/missing reset implementation was found in the focused engine-consumer search; no additional forwarder file was needed, enumerated for editing, or changed. No tests/assertions were added.

**Explicit old49 API preparation compatibility is unresolved.** The DB producer still supports explicit old49 migration/content/sealing without reset. Its reset honestly rejects an owned ready old49 target and fails that attempted copy without runtime DML. J2's required unconditional call therefore does not preserve successful API preparation configured to an explicit old49 target. An old49 _input_ migrated to genuine current target50 is distinct and may use this reset. No optional no-op, guessed catalog selector, reset fallback or producer change was added. Any policy for explicit old-target API preparation requires a separate exact contract/allocation.

Existing source-fixture generation currently uses the configured migrations bundle, while the full-copy assertions still expect 49 target entries and unchanged complete ledger. Retaining genuine old49 generation separately from target50 prefix-plus-one output, plus new50 inputs/reset metadata/reopened output, remains the previously identified fixture/version join. `restore.test.ts` and `create-legacy-fixture.mjs` remain unchanged under this lease; no pass is claimed.

## Separate apply-label allocation needed

`packages/api/src/backup-runtime/nitro-join/service.ts` still reports `blockedOn: "phase-owned-isolated-runtime-reset"` in `SourcePreparation.toJSON` and rejects `applyAsync` with `runtime-reset-unavailable`. `nitro-join/contracts.ts` declares both literal labels. These become misleading after J2 but remain outside this lease.

A later label-only correction needs those **two exact files** authorized together to describe unavailable whole-runtime maintenance/apply/recovery, with any actual label-dependent consumers enumerated before edits. Do not enable apply, substitute a maintenance shim or imply that copied reset closes host admission/drain/resource/recovery/auth obligations. Export's independent sanitization/key-distribution hold remains unchanged.

## Review and validation stop-line

Source frozen for independent behavior/standards review of the required structural method, exact awaited placement, same-copy ownership, rejection-before-seal, cancellation/disposal/error conservation, and explicit old49 incompatibility. Integrated existing focused preparation/reset/conservation checks, scoped types/lint/format, graph currentness and target50 sealed-reopen proof remain required after authorized convergence. None was executed or imported/evaluated in this lane; earlier engine evidence is not a fresh J2 result.

No checks, lint/types/build/format/install/tests, runtime imports, providers/network/SQL, environment/credentials/data, listeners/browser/container, Git or nested agents were used. DB/P3/catalog/migrations/runtime/security, archive/crypto/inspection/inventory, manifests, source fixtures and host resources were untouched. Whole current-backup restore, real authorized reads/writes, browser/restart, full maintenance/apply/recovery and #111/#112/#125 remain held.
