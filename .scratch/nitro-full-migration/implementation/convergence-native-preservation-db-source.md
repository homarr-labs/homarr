# Native preservation DB producer — source freeze

**Implemented the released three-file DB cut with real capture/codec/ownership bodies. Source frozen for coordinator checks and independent review; not compiled, executed or accepted as runtime/preservation evidence.** No MAIN, installer, fixture, migration, Auth/API or fourth-file implementation was added.

## Exact source and protected baseline

Private write-once0700/0600 source receipts: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-native-preservation-db-source-bxl3v1_p/`.

`before/` retains admitted source images and NEW-file absence; `after/` retains the three source images; `diffs/` retains source diffs; `pins/{before,admission,after}.json` bind their actual bytes and protected-source comparisons. Admission matched the supplied frozen DB3 runtime/gate/contracts prefixes. These are source IO receipts, not compiler/native/test results or private data observations.

| Frozen source                             | SHA-256                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ |
| NEW `packages/db/runtime-preservation.ts` | `641158160f64b649fa3e7d4ae94ae5b2df9f71dcb127535e98c5a4a1ac44b9f9` |
| `packages/db/runtime.ts`                  | `602444c299d199e5863694954a8a723a53630598215df1ecef781e007921620e` |
| `packages/db/transaction-gate.ts`         | `a603a0f0c831555fa48f965d1cd97425bc7bf0c8e0ff894c9aa97638a43e17d7` |

269 captured protected source/asset/manifest files remained byte-identical, including onboarding contracts/statements, SQL/schema assets, package/Core DB source and captured Auth4/API4 assembly/procedure joins. Existing runtime and gate diffs are additive only. Source-block comparisons retain exact shared SQLite unit, ordinary/onboarding gates, native publication records and detached publication reader. Existing COMMIT dispatch/acknowledgment, error precedence, rollback/busy restoration, quarantine, weak original identities and once-only publication behavior are unchanged. The old ready30s, epoch initializer, snapshot/adoption and ordinary/Auth/onboarding/PostgreSQL callers were not edited.

## Actual public ports

Existing `@homarr/db/runtime` exposes:

```ts
runtime.captureSqlitePreservationAsync(
  operation: SqlitePreservationOperation,
): Promise<NativeSqlitePreservationObservation>

encodeNativeSqlitePreservationObservation(
  observation: NativeSqlitePreservationObservation,
): Uint8Array

disposeNativeSqlitePreservationObservation(
  observation: NativeSqlitePreservationObservation,
): void
```

`SqlitePreservationOperation` requires exactly own-data `signal`, `lifetime`, `deadlineAt`, `originalWallStartedAt`, `originalMonotonicStartedAt`, `originalBudgetMs`, `originalMonotonicExpiresAt`. Input is validated, copied and frozen, including consistent expiry, finite original starts, safe integral wall/budget/deadline, positive budget<=10s and nonincreasing deadline. Deadline is the caller's original already-capped work/total bound; no separate renewal is introduced. Only the proposed types/encode/dispose are reexported, with capture on the actual runtime. No manifest/index/new subpath, raw client, reader, registration factory or pending/native helper is publicly exported.

## Native ownership / timing / cleanup

- Ready unlogged SQLite admission captures the actual retained connection and owner lifetime. Completion is registered and activity incremented before queued work. Dispatch rechecks phase/current owner/lifetimes/original budget; close cannot bypass the registered activity.
- New internal `boundedSqlitePreservationObservation` passes its original clock's `check`/`commitCheck` into the unchanged private `runBoundedSqliteTransaction`, with **no onboarding observation slot**. Its fixed-result internal callback is constructed only by the new runtime method, not a public caller override.
- One actual native unit performs K/full-bundle authentication → real epoch/mutex/domain/encoding and complete records → identity recheck → K/full-bundle/currentness recheck → existing pre-COMMIT and post-native machinery. No standalone readiness budget, epoch initialization, adoption or second connection is used.
- Original wall/monotonic remaining time, tightened deadline mapped from original starts and regressions are checked through read steps, cell/allocation/copy/sort/encode and unit/publication boundaries. Native millisecond clock is independently sampled before/after records through fixed SQLite `strftime` expressions, required inside the actual surrounding Date.now read window and nonregressing; no injected configured clock or fresh TTL is used.
- Actual native iterators are returned and statements finalized on success/failure/abort/overflow; original read cause precedes cleanup causes. Native prepare/step/finalize faults quarantine the resource. Unit rollback/restoration/COMMIT ambiguity remain the existing machinery's responsibility. Pending frames are erased on failed unit/postguard/publication; failure yields no public handle. Activity releases only after native work and owned failure cleanup physically settle.

## Fixed records / transfer bounds / representation

The module builds its private frozen ASCII-ordered specification from **every physical table and column** in the checked-in SQLite0050 snapshot, plus fixed ledger `created_at/hash/id`. It validates identifiers/type vocabulary/uniqueness; no consumer projection, SQL, expected rows, hash, reader or exclusion list is accepted.

Before transferring raw payload, a complete metadata-only pass on that same native unit enforces 4096/table, 32768 total, 1MiB raw TEXT, 16MiB BLOB, 20MiB encoded row **including its length prefix**, and 64MiB complete frame/header/ledger/runtime aggregate. A second same-unit pass uses native storage/length/whole-row CASE gates for payload transfer and verifies the preflight totals. Overflow rejects, never truncates; all tables carry explicit empty frames. These are representation bounds, not an RSS or synchronous-native preemption guarantee.

Frame format is versioned, length-prefixed and big-endian: fixed format/projection/policy/snapshot/bundle/encoding header, table/section/column names/types, row counts, then length-prefixed complete rows. Each cell has a storage tag and exact payload length. INTEGER is canonical signed64 native CAST-TEXT checked with BigInt; TEXT is raw BLOB-cast bytes; BLOB is exact detached bytes; REAL is finite native binary64 in explicit big-endian order, retaining signed zero as returned; NULL is distinct. Raw serialized/ciphertext strings are not decoded/restringified. Only separately validated ASCII epoch/domain metadata is interpreted, respecting recorded UTF-8/UTF-16 encoding.

Rows are sorted by bounded unsigned-byte comparison of **complete row encodings**, retaining duplicates. Counts enforce framing/bounds only, not equality. Existing credential-domain/sequence-pair validation is reused without changing it; genuine nullable pairs remain explicit, not enrolled by this observer. Sessions retain native INTEGER expiry and exact token/user/key records. Account/media/ciphertext/permissions/business/serialized families are all captured, including actual empty families; no specimens are created.

All four runtime tables are captured in the named `runtime` section. Only those tables are classified separately from `preservation`; Auth domain, credential keys, ledger, onboarding/claim and every business column remain in preservation. No reset/exclusion correction occurs in DB. Later MAIN must actually compare bytes and the separate E0→E1 reset / E1 restart predicates; this producer does not claim those results.

## Opaque and buffer lifecycle

Native prepared frames are registered privately with actual owner/original clock/bundle/epoch. Only after the real unit and postguards settle does runtime transfer that prepared record to a new producer-born opaque handle. A structural/copied handle resolves no record; no public field setter or expected-byte registration exists.

Encode resolves the genuine record, checks the original live bounds and returns a bounded **detached** copy, never a shared view. Encoding users are retained through copy/cleanup. Disposal retires the handle and zeros/releases its owned frame only after those users settle; repeated disposal of the same genuinely disposed handle is idempotent, forged handles reject. Detached output belongs to the future private transport consumer, which must retain/erase it through its own physical tasks; it does not share the observation's buffer. Temporary owned row/cell/frame buffers are erased on success/failure. No sensitive record/value/digest logging or public DTO was added.

## Remaining holds / handoff

DB/Core manifests and existing Bun SQLite declarations/source were read to reuse declared dependencies and native prepare/iterate/finalize primitives; no library was added. Only patch edits and explicitly released isolated Python file/hash/diff IO were performed. No compiler/typecheck/lint/formatter command, evaluation/product import, test, SQL/native/Engine/network operation, sensitive fixture/private configuration/data access, nested agent, commit or push occurred.

Coordinator owns fresh exact-byte checks and independent security/lifecycle review after this freeze. Source bodies are not a claim of type/lint/format zero or native execution. MAIN's real comparison/private baseline transport, genuine source/copy/seal lineage, original-total supervision and **same-candidate sealed-byte installation readback through exact EOF plus settled close** remain separate held owners. Memory initialization/adoption, fixture/writer production, filesystem installation, runtime/restart, Node/PostgreSQL parity, owning-entry/full Nitro, real restore/cutover and ports3100/3200 remain unauthorized. Historical native artifacts/results were not reused as current DB acceptance.
