# Stage P restore-owner handshake — planning only

**Affirmative conditional freeze release.** No worker in this lane consumes a mutable copied engine/runtime; backup/media source remains frozen. User-reported G3 behavior/standards acceptance (22 tests/311 assertions; 204 compatibility files preserved) supersedes historical HOLD prose. No G implementation was evaluated or hashed here. Accepted `b964b3120` backup evidence remains **40 domain families / 43 fixture rows / six ciphertext columns / source SQLite 49**; existing PostgreSQL ledger is 17.

Release permits requesting the narrow leases below, **not starting physical writes**. COMPOSITION must finish/freeze its currently allocated graph capture, acknowledge the release, and identify graph revalidation required by P before DB opens source. Q16 is independent of catalog planning; authenticated apply/restart remains held. No #111/#112/#125 completion.

## Candidate catalog/version contract

Consume `SQL-BACKING-PLAN.md` §§3/8/9: four infrastructure tables, not additional domain families. Append exactly one reviewed SQLite entry (index 49 → 50 entries) and PostgreSQL entry (index 17 → 18). Prior SQL files, journal-entry identities/order and snapshot bytes are immutable; journals change only by that suffix. No invented migration tag/timestamp, regenerated prior snapshot, domain-schema/default/seed or content-transform change.

Catalog version binds exact generated migration identities and engine-specific definitions:

- `homarr_runtime_meta`: IDs 1/2 only, epoch nullability CHECK, exact two initialization rows/sentinel.
- `homarr_runtime_state`: `(epoch,key)` PK, string payload, nullable fractional expiry; exact `(epoch,expires_at_ms,key)` index.
- `homarr_runtime_history_stream`: composite identity PK, log/sample CHECK, nonnegative sequence.
- `homarr_runtime_history_entry`: composite sequence PK, positive sequence, exact header FK/cascade; deterministic engine identity comparisons.

Validate bounded exact journal prefix and every schema object **before writes/discard/reset**: old-49 inputs cannot contain runtime objects; new-50 inputs require all exact columns/types/nullability/defaults/PK/CHECK/FK/index invariants. Reject missing/modified/extra runtime objects, all views/triggers/unknown tables and unauthorized indexes; retain reviewed internal-index/statistics exceptions. Do not broaden historical windows or delete objects to manufacture compatibility. Revalidate catalog after migration and on reopened output.

## Proposed exclusive leases

**DB owner:** `packages/db/runtime-catalog.ts`, `schema/runtime/{sqlite,postgresql}.ts`, explicit engine generation configs, new SQL/snapshot assets plus journal suffixes, minimal `copied-sqlite.ts` catalog consumer/concrete reset operation, and existing `runtime.spec.ts`/legacy fixture adjustments. Preserve ordinary runtime/G/Core/driver signatures and behavior; further compatibility-helper edits require named allocation. No domain-owner migrations or host orchestration.

**Restore owner, after DB port review:** `restore.test.ts` target assertions/old-prefix fixture configuration, plus only the concrete isolated-reset port wiring in `contracts.ts`, `sqlite.ts`, `index.ts` if separately allocated. No parser/crypto/inventory/controller/export/policy rewrites. Current `BackupEngine` lacks reset; test-only updates cannot integrate it. Proposed additive engine operation accepts its owned copy and signal, generates target epoch internally and atomically clears runtime rows/restores valid meta. No arbitrary callback, SQL, caller-selected epoch or live-runtime handle. Its exact signature/phase enforcement remains candidate until reviewed.

Placement: SQL migration → source ciphertext validation/rekey/reference checks → five existing content transforms → target validation/reference checks and migration logout → **isolated runtime reset/fresh target epoch/catalog verification** → seal/close → reopen verification. This added placement requires producer/consumer acceptance; current accepted preparation is unchanged.

## Fixtures, privacy and readiness

Keep genuine old-49 Node/better-sqlite3/AdmZip export using unchanged `create-legacy-fixture.mjs`; configure an owned test-only old-prefix migration bundle from immutable originals, not latest-50 assets. Preserve complete raw-row/noncipher/bcrypt/media/SuperJSON/reference assertions and original digests. Assert target ledger equals source prefix **plus exact appended identity**, four exact runtime tables, empty imported runtime authority and fresh epoch. Separately exercise valid new-50 input and catalog rejection before reset; retain existing historical content cases, not a new matrix.

Ordinary restart preserves epoch, absolute expiry, status and histories; full restore resets only runtime infrastructure. Durable Assistant/message history is not Redis history. Export privacy proposes exclusion only on an isolated snapshot with valid schema/meta/ledger, never live-row clearing; key carriage/distribution remains #111-held.

Final target proof requires matching reviewed catalog, packaged assets, consumer graphs and fixtures; source-49 evidence alone cannot certify target-50. Whole-app maintenance/filesystem recovery/real-auth read-write-restart remain separate gates. Only this planning file was written; no commands/tests/data access or physical allocation began.
