# Native preservation observer — narrow missing-producer plan

## Decision / scope

**Propose one fixed SQLite observation producer in DB and one real MAIN comparison/private-transport consumer.** The seeded-file route's PLAN APPROVE is a coordinator premise, not a source-authoring, initialization, filesystem, runtime or restart grant. Today's methods do not supply this producer. The cut below describes executable bodies and their births/settlement, not an interface-only registry or a caller callback claiming native evidence.

Only this new report is written. Inspected frozen DB/MAIN source, target schema assets and manifests; did not inspect the four actively authored Auth wire files, live external C/H/P copy-v2 outputs, production/private configuration or data. No commands, hashing, stat, checks, compilation, evaluation, tests, network, SQL execution, Engine operations or nested agents occurred. Future memory proof, native fixtures, compiler/checks, file installation, restart and testing remain independently held; real restore/cutover and ports 3100/3200 remain unauthorized.

## Existing seams, and what they do not prove

| Source                                                                                             | Fact relevant to this cut                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/db/runtime.ts:285–477`                                                                   | Retained connection/phase/active/lifetime checks, native tracked/finalized K reader, full-target assertion and settled-unit quarantine already exist. Reuse their genuine native connection, not a second factory/connection or caller catalog reader.                                                             |
| `packages/db/transaction-gate.ts:176–277`                                                          | Existing bounded SQLite unit owns BEGIN IMMEDIATE, scope revocation, COMMIT/ROLLBACK, busy-timeout restoration and ambiguous/cleanup quarantine. A read-only business observer can use this unit; it is not SQLite `query_only` and obtains a writer-reservation lock. No business DML is needed.                  |
| `transaction-gate.ts:27–31`; `runtime.ts:130–158`                                                  | Ordinary bounds contain signal/lifetime/deadline only; target timing starts at method entry. That cannot silently be described as the observer's original admission-time monotonic budget. This cut requires explicit original timing, also at commit checks.                                                      |
| `packages/db/main-target-catalog.ts:880–976`                                                       | K authenticates actual objects, complete ledger, runtime anchor and meta storage shape. It does not read every business row or establish their equality.                                                                                                                                                           |
| `packages/db/migrations/sqlite/meta/0050_snapshot.json`                                            | Source-owned complete physical table/column definitions, including Auth domain/key columns. Use this immutable imported target, not a live schema-enumeration result supplied as projection configuration.                                                                                                         |
| `apps/backend/src/server/runtime-composition/native-main-persistence.ts:239–312,389–435,1229–1328` | Actual constructor retains one native runtime. It registers operations before invocation and drains them on disposal. Returned guarded runtime exposes `runAsync`/readiness only; no preservation capture/comparison/transport port exists.                                                                        |
| `runtime-composition/contracts.ts:94–126`; `runtime.ts:71–94,227–245`                              | MAIN config/runtime contracts have no observation field. Public host creates the actual native owner and returns assembled resources, not a public persistence getter. Do not pretend existing `host` supplies the missing proof caller.                                                                           |
| `packages/db/copied-sqlite.ts:202–245,305–344`                                                     | Actual copy reset affects exactly four runtime tables; seal validates/reset-checks, VACUUMs and closes before returning bytes. Its plain `{dialect,bytes}` return has no publicly authenticated seal-result registry. The future private proof consumer must retain the actual awaited owner/method/outcome chain. |

DB already exports `@homarr/db/runtime`; Backend declares DB/Auth/API/contracts and exports only `@homarr/backend/host`. DB declares Drizzle/Core and existing workspace dependencies; existing code uses `node:crypto`, `node:fs`, `node:fs/promises`, Buffer and Bun SQLite. Reuse these; no new library, package, generic data framework, privacy logger or test is proposed. No Auth source/manifest edit is part of this cut.

## 1. Fixed complete-schema projection

NEW `packages/db/runtime-preservation.ts` owns an immutable **SQLite-only** specification. Import the checked-in `0050_snapshot.json`, form a module-private frozen deterministic specification from **every** table and **every** physical column there, and add the source-fixed ledger columns `__drizzle_migrations.{id,hash,created_at}`. Names and column order are sorted by an explicit ASCII byte comparator; validate uniqueness/identifier grammar/type vocabulary at construction. Do not use Drizzle's application property names, ORM mappers or backup inventory as the record definition.

The target table set is exactly:

`account`, `apiKey`, `app`, `assistant_configuration`, `assistant_message`, `assistant_thread`, `homarr_auth_credential_domain`, `boardGroupPermission`, `boardUserPermission`, `board`, `cron_job_configuration`, `custom_widget_v2_definition`, `custom_widget_v2_secret`, `groupMember`, `groupPermission`, `group`, `iconRepository`, `icon`, `integrationGroupPermissions`, `integration_item`, `integrationSecret`, `integrationUserPermission`, `integration`, `invite`, `item_layout`, `item`, `layout`, `custom_widget_definition`, `custom_widget_secret`, `media`, `onboarding`, `search_engine`, `section_collapse_state`, `section_layout`, `section`, `serverSetting`, `session`, `user`, `verificationToken`, `widget_secret`, `trusted_certificate_hostname`, `homarr_runtime_history_entry`, `homarr_runtime_history_stream`, `homarr_runtime_meta`, `homarr_runtime_state`, plus `__drizzle_migrations`.

All physical columns from that immutable source definition are included. For example, include all account token fields, user password/preferences/header serialization, session token/user/expiry and both credential sequences, API-key hash and both sequences, every Auth-domain field, all permission/member/owner edges, all media BLOB/metadata, assistant contents/ciphertexts and both generations of custom-widget source/request/options/template/secrets. Do not maintain a second shorter hand-selected security-column list.

Authenticate K in the **same native read unit** before observing records; reassert target identity/currentness before unit exit. The recorded identity is the actual authenticated bundle identity, never a caller digest or version. Preserve runtime anchors SQLite49/PostgreSQL17 versus complete targets50/18 and ledger entries51/19. PostgreSQL is not implemented by this SQLite observer and remains held.

No caller SQL/table/column/ordering/exclusion list, row reader, hash function, expected-record function, decoder factory, native pool/client or scope getter is accepted. Fixed query text is formed only from the private specification's validated identifiers. Live unexpected tables/columns/objects fail K, rather than being silently omitted. K-approved `sqlite_stat1`/`sqlite_stat4` are physical planner metadata, not logical application records; K's existing validation remains, and their exclusion is explicitly not a populated business-family claim. No hidden rowid/physical record address/page-layout comparison is used.

## 2. Proposed finite policy — NEW choices for independent review

These are **new synthetic preservation-observer policy candidates**, not existing product/backup limits, measured capacities or permission to read data:

| Limit                                       | Candidate                                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Rows per fixed table                        | 4,096; read at most cap+1, reject overflow, never truncate                                                                 |
| Rows across all fixed tables                | 32,768                                                                                                                     |
| Raw TEXT bytes per value                    | 1 MiB                                                                                                                      |
| Raw BLOB bytes per value                    | 16 MiB                                                                                                                     |
| Encoded bytes per row                       | 20 MiB, including tags/lengths/storage facts                                                                               |
| Encoded bytes for complete observation      | 64 MiB, including all frames/runtime/ledger/header                                                                         |
| Private baseline file/frame                 | 64 MiB; no compression or base64 expansion                                                                                 |
| Individual original observation work budget | At most 10 seconds, additionally capped by original overall work/total deadlines; never renewed at read/copy/compare entry |

Values above are source-fixed for this version after approval, not request options. Any increase/new profile needs its own policy/source review; oversized valid records yield **unavailable/limit-exceeded**, not preservation success. An empty table has an explicit empty frame, not an absent/missing field. Sorting/copies/decoder allocation require separately reviewed supervisor memory/resource allowance; a 64-MiB payload bound is not a claim of 64-MiB RSS.

Query scalar storage/byte-length facts and gate payload expressions before transferring an oversized value into JavaScript. TEXT byte measurement uses its BLOB cast, not `length(text)` character count or `Buffer.byteLength` of an already-decoded string. Conditional payload selection suppresses transfer when a bound fails; oversize markers reject. Iterator steps, each cell/frame allocation and byte comparisons decrement/check aggregate bounds and original clocks. SQLite's scan/cast/sort/native internal work may still consume resources or block; these limits do not promise interruption or bounded native RSS. Outer original hard-wall/failure policy is still necessary.

## 3. Deterministic private representation

Use a small **versioned, length-prefixed binary record format**, implemented in the DB-owned file with Buffer/Uint8Array/DataView. It is specific to the fixed target, not a general serializer or new library. Header binds format/projection/policy version and actual K bundle identity. Fixed table/column frames include explicit empty frames and duplicate row multiplicity. Keep actual observed epoch/runtime facts in a separate section of the same observation.

For each cell capture the native `typeof` storage tag and the following value representation:

- NULL: a distinct zero-payload tag. Not interchangeable with empty TEXT/BLOB, zero, absent column or failed read.
- INTEGER: canonical signed64 decimal **TEXT projected by SQLite** plus native storage=`integer`; validate grammar/range with BigInt, never pass through a JS number. All integer cells use this representation, not just credentials. Auth head must be nonnegative; enrolled lifetime/write pairs must satisfy the existing native ready-domain/pair predicates, with nullable-pair semantics retained. Values up to signed64 maximum stay exact.
- TEXT: raw bytes obtained by the native BLOB cast with storage=`text`, byte length and actual database encoding fact. Do not decode/re-encode user/ciphertext/SuperJSON strings or normalize Unicode/newlines/JSON. Encoding observation is fixed and checked within the native unit; comparison rejects an encoding mismatch rather than guessing conversion.
- BLOB: detached exact bytes with storage=`blob`, preserving zero bytes and empty BLOB. In particular `media.content` remains binary, not an image path or encoded string.
- REAL, where present: finite native double value encoded in an explicitly selected IEEE754 binary64 byte order plus storage=`real`. Preserve signed-zero distinctions as returned; reject nonfinite/unrepresentable values. Do not use rounded decimal formatting or INTEGER coercion. This is equality of SQLite-exposed value/storage, not physical on-disk numeric encoding.

Support SQLite's actual storage classes explicitly; do not allow an unknown class to become a string/default. Do not silently coerce surprising affinity values to the declared schema type. Auth/domain/sequence/expiry invariants are checked with their required storage semantics in addition to complete capture. No password verification, decrypt/re-encrypt, new session, claim, account or other business write is performed by this observer.

Within each table, encode each complete row in the fixed column order, then sort complete row encodings lexicographically by unsigned bytes under the finite bounds. Compare the resulting ordered **multiset**, including duplicate rows. This avoids collation/rowid/order assumptions for tables without a unique row key. Compare all bytes/tags/lengths directly; counts are framing/limit facts only. A digest is transport integrity, **not** the logical equality algorithm, and physical SQLite file equality is not used.

### Named projection exclusions / reset facts

Capture every fixed table, but define `preservationProjection` to exclude **only**:

1. `homarr_runtime_history_entry`
2. `homarr_runtime_history_stream`
3. `homarr_runtime_state`
4. `homarr_runtime_meta`

Compare those four in a separate runtime section with explicit reset/restart predicates. Never exclude `homarr_auth_credential_domain`, session/API-key native keys, ledger, onboarding/claim, serialized settings/widget strings, permissions or any business row. No caller-selected ignore list exists.

Copy comparison requires byte-exact equality of the entire preservation projection. Separately require the actual memory epoch E0 and copy epoch E1, E1 valid and different from E0; destination runtime history/state empty, exactly native meta id1/E1 and id2/NULL. Bind that result to the **actual retained copy-owner reset/seal outcome** from the private proof chain. An observed different UUID alone proves no reset provenance. The copy engine's existing ownership/validation remains mandatory.

Restart comparison requires exact preservation projection **and exact runtime section** against the first-file baseline, including E1 unchanged. If authorized runtime writers changed state/history between observations, this strict restart predicate fails; return that divergence for separate review rather than broadening exclusions. A successful business projection with runtime mismatch is not advertised as complete restart preservation. No epoch reset/remint occurs on restart.

Empty equality is explicit per family. A credentials user/session writer need not create an OAuth account, media or encrypted row. Positive-family preservation claims require actual approved writer-produced specimens; otherwise report **empty equality**, never invent fixtures with direct SQL or hide those families.

## 4. DB real producer and original bounds

Prospective public contract via the existing `@homarr/db/runtime` export:

```ts
captureSqlitePreservationAsync(
  operation: SqlitePreservationOperation,
): Promise<NativeSqlitePreservationObservation>

encodeNativeSqlitePreservationObservation(
  observation: NativeSqlitePreservationObservation,
): Uint8Array

disposeNativeSqlitePreservationObservation(
  observation: NativeSqlitePreservationObservation,
): void
```

`SqlitePreservationOperation` contains existing signal/lifetime/deadline fields plus mandatory original wall start, monotonic start, original budget and monotonic expiry. These are bounds/data, **not** native authority or acceptance supplied by a caller. The producer validates their consistency and fixed maximum budget; reads actual Date.now/performance.now samples and checks original remaining wall/monotonic time and regressions. No injected `now`, SourceCalendar, replacement clock, new Date.now()+budget or budget inferred from a post-copy event is accepted.

The actual method body in `runtime.ts` must:

1. Reject non-SQLite, logger-enabled, non-ready, quarantined, closed/changed owner or invalid/expired original bounds; capture its **retained private connection** and current owner lifetime.
2. Register its pending completion before scheduling/invoking native work and increment actual runtime activity. Recheck owner/phase/lifetimes/bounds at dispatch; no native task starts after close/admission failure.
3. Enter the existing native bounded unit on that exact connection. Execute K and the fixed epoch/meta/domain observations and complete-record producer inside that one unit. All public consumer callbacks are absent; the native unit's internal callback is fixed product code, not caller SQL.
4. Bracket every prepare/iterate/step/value-transfer/finalize and final unit exit with original checks. Finalize statements and retire iterators even on abort/overflow/decode/native failure. Retain primary versus finalization/rollback/timeout-restoration errors separately and preserve existing quarantine classification.
5. Recheck full-target identity/epoch/currentness and original bounds before COMMIT and after physical native settlement. Epoch change within capture rejects. The producer never updates epoch, touches business DML, adopts credentials or substitutes a fresh connection.
6. Only **after settled unit success** publish a new opaque observation into a module-private record with the actual runtime-owner/capture association, fixed frame bytes and safe capture metadata. No exported `register`, supplied-row constructor or brand-only factory exists. On failure publish no observation; retain/drain the physical task before activity decrement/close.

The mandatory original pre-COMMIT guard requires a **narrow new internal original-timing gate** in `transaction-gate.ts`, using the same existing SQLite unit implementation. Do not change ordinary transaction/write timing or weaken generic COMMIT/quarantine rules. The observer-specific guard derives every check from the original operation; there is no entry-time renewal of the monotonic budget. Its internal callback is callable only by the actual runtime observer implementation, not added to public runtime configuration.

`encode...` resolves an actual producer-born observation and returns one bounded detached copy of its canonical private bytes. It is a sensitive transport accessor, not a public HTTP response or permission DTO. It never accepts a row object or expected bytes to mark native. `dispose...` retires the observation and releases/zeroes owned buffers when no tracked encoding/transport task still uses them. The encoding/disposal path must obey finite byte ownership and be included in MAIN/proof task settlement, not an untracked post-success operation.

A capture establishes a point-in-time native read. Quiescence across capture → native snapshot still belongs to the actual proof writer owner: close/drain genuine issuer/writer tasks first, deny external writers through the private file/work lease and then capture/export sequentially. The observer must not invent a generic `assertWritersClosed` callback or make source-born native evidence from a caller boolean. Any external writer or unclosed preparation makes the later snapshot association held.

## 5. MAIN real capture/comparison bodies

NEW `apps/backend/src/server/runtime-composition/native-preservation.ts` owns the fixed private binary decode/comparison, file transport and opaque baseline/comparison states. Its constructor is invoked only at the actual native MAIN construction site with the retained runtime/owner lifetime and a genuinely captured private proof scope. That scope does not exist today. The exact additional, prospective construction join is:

```ts
openNativePreservationProofScopeAsync(
  proofControlPath: string,
  operation: SqlitePreservationOperation,
): Promise<NativePreservationProofScope>

createNativeMainPersistenceResourcesAsync(
  configuration: MainPersistenceConfig,
  preservation?: NativePreservationProofScope,
)
```

The fixed scope opener actually opens/reads/validates/closes the protected finite supervisor control and binds its real scope directories, identities and original operation in a private record before returning a handle. It accepts no factory/assertion/reader/hash callback. MAIN resolves that real record once at construction, binds it to its newly retained native owner and rejects structural/cross-scope/reused handles. The scope authorizes only the approved private transport locations; its file/control observations are not native capture/adoption evidence. Its pending/open-failure/cleanup obligations belong to the proof caller until successful ownership transfer. Normal product callers omit the second argument; no preservation ports are usable without the actual scope. No startup-schema/env selector is added.

This is not a public factory accepting an observer, exporter, arbitrary DB, assertion callback or field registry. Module-private state is populated by completed real file/native work, not structural objects passed by a proof caller. The contracts lease below includes this opaque scope type; the new proof caller must call the actual opener and transfer its result before invoking MAIN, not construct that field itself.

Add these methods to the **actual result object** in `native-main-persistence.ts`, with a narrow `MainNativePreservationPorts` contract in `contracts.ts`; do not expose them through generic `AdmissionRuntime` or RPC/Auth contexts:

```ts
captureNativePreservationBaselineAsync(
  operation: SqlitePreservationOperation,
  destination: string,
): Promise<MainNativePreservationBaseline>

readNativePreservationBaselineAsync(
  operation: SqlitePreservationOperation,
  proofControlPath: string,
): Promise<MainNativePreservationBaseline>

compareNativeCopiedPreservationAsync(
  operation: SqlitePreservationOperation,
  baseline: MainNativePreservationBaseline,
): Promise<MainNativePreservationComparison>

compareNativeRestartPreservationAsync(
  operation: SqlitePreservationOperation,
  baseline: MainNativePreservationBaseline,
): Promise<MainNativePreservationComparison>
```

All are **proposed**, not existing methods. `destination`/`proofControlPath` must be inside the separately approved private proof scope; accepting a pathname never proves a native source. No supplied expected hash, expected rows, arbitrary compare mode, exclusion option or dispatch policy is a method parameter. The two comparison methods have fixed copy-reset/restart-exact semantics.

MAIN prepublishes a dedicated task/underlying/outcome record in its owner before any capture, baseline open/read/write, encoding or comparison. Reuse existing operation/drain mechanics with a narrowly typed preservation record for stage/settlement; preserve operation failures through sanitized MAIN errors. The runtime invocation is literally `retainedRuntime.captureSqlitePreservationAsync(originalOperation)`, not `runAsync(callback)` or an injected exporter. Recheck MAIN lifetime/currentness and DB observation association before returning a handle.

Capture method obtains the real observation, encodes it, performs the private exclusive transport transaction, waits sync/close/cleanup, then publishes the local baseline handle. Baseline reader performs fixed protected file/control validation and bounded decoding, then publishes a **transport-bound baseline-data** handle. It does not publish a native observation or assert that a previous process's WeakMap survived. Comparisons resolve that actual locally retained baseline, capture a new actual native observation on the MAIN runtime, decode with the same fixed format/specification, execute byte-exact comparison and the respective reset/restart predicate, dispose transient observations, and publish only after all underlying read/native/comparison tasks physically settle.

Opaque comparison transitions are:

`registered → baseline-reading / observing → comparing → matched | different | failed → retired`.

Private record binds selected fixed comparison kind, MAIN owner/lifetime, actual capture, source/destination epochs, schema/policy/projection identity, original operation association and transport association. No handle is born `matched`. `different` is a settled unsuccessful equality result, not a native cleanup failure or permission to repair/retry. `failed`/ambiguous settlement cannot publish match. A handle copied/forged/reused under another owner/operation rejects. Returning a handle alone is not final preservation acceptance.

Provide a fixed sanitized **comparison-summary accessor** on the MAIN proof ports that resolves the actual published handle and returns only stage/kind/equality/reset-or-restart outcome and per-family `empty-equal | nonempty-equal | different | unavailable` facts. It must not return sensitive bytes, row locators, hashes, tokens, ciphertext, passwords or arbitrary nested causes. That accessor reports recorded facts only, grants no Auth/native permission and does not claim that empty equality is populated coverage. Comparison handles remain owner-local; finalized sanitized records may be retained after clean owner close through the private proof transcript, not turned into new live leases.

Disposal waits preservation tasks and actual file handles/iterators/native units before issuer/helper/runtime close and before baseline-buffer retirement. A closing/aborted owner cannot start new observation or emit a live match; already settled facts remain retained with the actual close/outcome. A generic Promise.race, wrapper rejection, timeout notification or handle brand is not task settlement.

## 6. Private baseline transport across genuine restart

Use only new proof-owned private0700 directories and exclusive/no-follow0600 regular single-link baseline/control files. Baseline bytes carry finite sensitive records; never public assets, logs, Markdown, request DTOs, base64 in tool calls or a network service. The supervisor remains the sole control/transcript writer and retains the original source-capture/export/copy/install/close lineage; the child is not allowed to assert that lineage by setting receipt booleans.

Writer performs bounded exact-byte write → sync → close, obtains actual opened-file identity, and computes the transport digest from the real encoded bytes/closed-file observation. Reader uses a fixed protected control path, validates format/projection/policy/bundle identity, opens no-follow and validates the actual descriptor, bounded size, complete EOF, stable descriptor/path identity and protected ancestors. Its fixed binary decoder checks every length before allocation, exact fixed table/column membership/order, storage tags, canonical integer/REAL encodings, row-multiset ordering/multiplicity, aggregate limits and absence of trailing/duplicate/unknown frames. It computes the digest from actually read bytes and checks the supervisor-owned immutable transport binding. No caller digest is treated as an equality oracle; matching digest alone is insufficient.

The private control binding includes actual capture/stage/operation association, source generation, measured baseline byte length/digest and stable file identity, original supervisor total bounds, selected candidate/epoch-stage association and physical source/copy/file-close outcomes. Birth of these records must come from the fixed proof caller's actual completed producer/tasks and the supervisor's observations. A structurally valid file imported from elsewhere is merely data, never source-native proof. If the supervisor cannot establish the producer/control/file lineage, the receiver may report a data comparison but must keep **preservation acceptance held**.

Use two immutable baselines, not an overwritten manifest:

- **B0:** complete source-memory capture after genuine writers drain and before its associated native snapshot; stores E0/runtime plus all preservation records.
- **B1:** actual first existing-file MAIN capture after source→copy comparison against B0 succeeds and before first MAIN shutdown; stores E1 plus the complete runtime section for strict restart comparison.

Do not derive B1 by editing B0's epoch, copying expected business frames into a new record, or guessing copy-reset output. First MAIN actually observes B1. On restart, receive B1 as verified private data and obtain a completely new native observation before comparison. Retired old issuer/session-read leases, native connection identities and opaque brands are never reconstructed from the transport.

Cross-process clocks require explicit handling: supervisor retains its original total wall/monotonic starts/deadlines. A child does not subtract another process's performance.now values. At each separately authorized child admission, fixed control code maps only the **remaining original absolute deadline**, with the reviewed clock/skew/transport allowance, into that child's once-captured local monotonic bound. This mapping must never increase parent remaining time or compute a fresh full budget after copy/restart. Each new native observation is a real new admission within the same original total envelope, not a replay of the source lease. Unverifiable clock mapping/expired total envelope is a stop, not a renewed deadline or guessed SourceCalendar.

A trusted control-file digest and stable identity bind data/operation transport; neither establishes opened-native file adoption. These observation methods never mint `freshCredentialOwner`, import `accepted_native` as a file fact, call adoption or relax the existing file-first-adoption hold.

## 7. Exact prospective source cut / caller

These are **proposed leases requiring approval**, with no source authoring now:

| Owner / path                                                                                        | Concrete body change                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB: NEW `packages/db/runtime-preservation.ts`                                                       | Fixed target specification/policy, original-operation validation, complete raw cell/frame producer, deterministic bounded codec, actual producer-born observation records and encode/dispose operations. No externally supplied native connection/row registration public export.                                                      |
| DB: `packages/db/runtime.ts`                                                                        | Actual retained-connection capture method, prepublished activity/task, one K/native unit, epoch/currentness guards, physical settlement/quarantine and public type/encode/dispose reexports through existing `./runtime`.                                                                                                              |
| DB: `packages/db/transaction-gate.ts`                                                               | Narrow observer-only original-timing gate using existing SQLite unit/commit/cleanup machinery. No change to write/adoption semantics, new generic consumer callback or PostgreSQL admission.                                                                                                                                           |
| MAIN: NEW `apps/backend/src/server/runtime-composition/native-preservation.ts`                      | Fixed byte comparison, private baseline/control FS transport and real baseline/comparison state transitions/summary/cleanup. Concrete code, not a declaration-only factory.                                                                                                                                                            |
| MAIN: `apps/backend/src/server/runtime-composition/contracts.ts`                                    | Narrow `MainNativePreservationPorts` and opaque local baseline/comparison/result types. Do not widen generic DB factories or Auth/body/handler contracts.                                                                                                                                                                              |
| MAIN: `apps/backend/src/server/runtime-composition/native-main-persistence.ts`                      | Construct the exact fixed consumer beside the retained runtime; add actual result methods, prepublish task/outcome association and drain/retire them on physical owner close. No private runtime getter.                                                                                                                               |
| Proof caller: NEW `apps/backend/src/server/native-preservation-proof.ts`                            | Backend-owned finite listener-free proof entry that reads only separately authorized synthetic control/config, constructs the **actual** native MAIN, calls ready/capture/read/compare/summary/dispose in the fixed sequence and records underlying/close outcomes. No injected observer/DB/renderer/no-op contribution or HTTP route. |
| Private supervisor: new proof `author/supervisor.mjs` and its disjoint immutable controls/baselines | Real original-clock/private-transport/child-stopped association; consumes actual memory DB capture and real copy/seal output from the separately approved route, not existing external C/H/P outputs. Allocations and source/closure approval remain separate.                                                                         |

DB's existing `./runtime` export suffices: no DB manifest/index/schema/migration change is needed merely to expose these fixed methods/types. Backend proof entry is an explicitly compiled **Backend-owned source entry**, not a claimed current public package export or undeclared Nitro deep import. No Backend manifest export is needed for that contained entry. If a later external caller must import it publicly, request a separate exact `apps/backend/package.json` export lease rather than pretending `./host` includes it.

Do **not** change `runtime-composition/runtime.ts`, `assembly.ts`, `compose.ts`, `host.ts` or startup schema solely for this narrow constructor-preservation proof: no HTTP enrollment or product startup behavior is required. The new proof caller is the actual caller, not a missing declaration. Consequently this cut proves, when separately run/accepted, **native MAIN constructor readiness/comparison/restart**, not owning-entry/full Nitro startup. Any later owning-entry admission must name its real caller/configuration/publication paths in a separate source plan; a fake renderer or public DTO must not bridge that distinction.

The separate finite filesystem installer stays a private proof consumer, not a new global product install API. Its implementation must obtain the genuine copy from the fixed engine, await compatibility/schema/content/reset/seal, retain the real seal result object and owner/outcome privately, verify limits and physical cleanup, then write only its new absent candidate through exclusive/no-follow0600 write/sync/close. It accepts no arbitrary supplied `{dialect,bytes}` as evidence of seal completion. Seal bytes/digest alone cannot prove the copy-owner sequence; preserve the actual audited call/outcome lineage. `copied-sqlite.ts` and active copier executor stages are not leased by this observer cut.

## Review/acceptance gates

1. Approve NEW policy limits/format, complete source specification, original timing/commit guard and private transport trust boundary before source authoring. If byte extraction, native REAL/TEXT storage/encoding or same-unit K cannot be established without caller/native escape, stop at that producer rather than publish a stub.
2. Independently review actual DB and MAIN bodies/caller enrollment/task drainage, then allocate exact fresh focused checks/closure. No checks or tests are authorized or run in this report.
3. Separately authorize new synthetic writer-produced input, contained memory initialization/adoption, copy/FS output and two sequential MAIN lifetimes. Freeze writer ports with their owner; no Auth wire work is duplicated or mutable Auth source consumed here.
4. Accept source→copy match only with genuine B0 producer/snapshot/copy-reset/seal/install lineage and settled native/FS outcome. Accept restart match only with genuine B1 capture, first MAIN physical close, new MAIN native capture and settled comparison/second close. Preserve mismatch/known/ambiguous/cleanup outcomes; never auto retry, repair records or extend the total deadline.
5. Assess positive and empty families separately. No populated-account/media/encryption, restoration, file first-adoption, PostgreSQL/Node parity, owning-entry/full-app or cutover claim follows from interfaces, row counts, transport hashes or this plan.

## Controlling amendment — sealed-byte installation readback (reviewer P2)

This amendment controls the finite installer's admission condition above; all other proposed stored-value/current-connection observation contracts remain unchanged. It uses the already named private installer/proof lease, with no additional API, framework or model, and grants no execution authority.

After exclusive/no-follow candidate creation, unchanged sealed-byte write, fsync and physical close, the installer must **boundedly reopen that same candidate read-only/no-follow** before first MAIN admission. Validate the canonical protected private parent and candidate path, actual reopened descriptor/path identity against the retained created-file identity, permitted owner, regular-file/single-link status and exact expected size. Recheck stable descriptor/path identity through the readback; path attributes alone are not evidence of installed-byte equality.

Read in bounded chunks and compare every byte directly to the **privately retained genuine seal-result bytes**, without replacing that baseline with a caller digest or reconstructed result. Require exact expected length and actual EOF, including a bounded extra-byte probe that rejects overflow. Retain the seal bytes until readback and all read/close tasks physically settle. Physically close the reopened descriptor on every outcome; only successful exact-byte comparison, identity validation and settled close permit first MAIN admission. All work and cleanup remain inside the **original total bounds**, with no renewed post-write/readback budget.

On mismatch, abort, read, identity or close failure, retain the first cause, separate cleanup failures and the possibly installed candidate; stop admission. No retry, overwrite, rename, reset, repair or replacement candidate is authorized. K and later logical-record comparison do **not** substitute for this byte-installation check. No product edit, command/hash/stat/check/evaluation/test/network/SQL/Engine/private-configuration/data access or nested agent was performed for this amendment; live metadata/copy-executor stages and the disjoint DB-expiry source planner were untouched.
