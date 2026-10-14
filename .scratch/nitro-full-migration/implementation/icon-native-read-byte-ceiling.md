# Icons native read byte ceiling — P2 correction candidate

**Frozen for original Spec + correction Standards/evidence rereview; no self-closure.** Sole product edit: `packages/icons/src/native-read.ts`. Sole new handoff: this file, globbed absent initially and immediately before creation. Prior source handoff and the complete `icon-native-read-source-20261011` evidence history remain unchanged. Original Standards/evidence acceptance was scoped to the prior source, with upstream strict failures explicit; neither original nor current actual-FS captures are represented as immutable-before-execution certificates.

## Exact source delta

- Required before SHA-256 verified: `7cd86a80e5f0cc2308c26e3f74529e9918cd74da96ff4312b1f66c09d9bdc1b7`.
- Frozen candidate SHA-256: **`9f3edb1f0195ca7b74cdd95fa2158af29ba0c4ab3ec751c19e90ecc7086cb78a`**, 586 lines.
- Three bounded diff hunks only: derive outer `deliveryRows`; bind it in the existing outer LIMIT; enumerate actual fixed-kind row charges and reserve the maximum rejection sentinel in factory safe arithmetic. No comments, casts, explicit `any`, suppressions, dependencies, additional helpers outside this file, tests or public-limit changes.
- Complete count/sum/max windows, CASE suppression, metadata/result validators and budget deductions are unchanged. All source strings/parameter rules, fractional PostgreSQL numeric comparison, scalar/NULL/binary/size semantics and ordering are unchanged. Native invocation/callbacks, COMMIT/ambiguity precedence, deferred/domain ownership, failure latch, task registration and close/drain bodies are unchanged.

## Delivery and reservation derivation

Let `R = maxResultRows`, `B = maxResultBytes`, `P = maxParameterBytes`, `N = maxPendingReads`; each query has remaining `r/b` and its actual defined per-row private-field/metadata overhead `H`.

```text
L = min(safeSum(r, 1), safeSum(floor(b / H), 1))
S = max(all eight fixed-kind rowCharge values) = 360
maximumNativeDeliveryBytes = safeSum(B, S)
maximumRetainedBytes = safeSum(B, maximumNativeDeliveryBytes) = 2B + S
concurrent reservation = safeProduct(safeSum(maximumRetainedBytes, P), N)
```

`H` is derived from the unchanged `rowCharge`, not a guessed allowance: record 32; every returned/private key's UTF-8 bytes + 24 field/null charge; three metadata representation charges of 16 each. Picker includes private `group_position`.

| Fixed kind                         | Defined `H` |
| ---------------------------------- | ----------: |
| lookup / icons                     |    331 each |
| media                              |         289 |
| repositories                       |         230 |
| direct                             |         203 |
| serialized / count                 |    205 each |
| picker, including private position |         360 |

**Admitted complete delivery:** unchanged windows require `payload + sourceRows × H <= b` and `sourceRows <= r`; consequently every admitted source row fits within `L`. No successful pagination/truncation is possible.

**Rejected delivery:** unchanged CASE suppresses source payloads when the complete result exceeds its budget. At most `L` defined-overhead records arrive, and `L × H <= b + H <= b + S`. A nonempty result always has at least one delivery slot; whole-result `__rows/__bytes/__max_media` still rejects oversize or incomplete delivery before suppressed fields can be interpreted as source values. Admissible all-null direct references remain legitimate NULL values, not a suppression marker.

**Whole group, including first valid payload then second rejection:** let the first admitted query consume `D <= B`. The second has `b = B - D`. Native logical delivery across the group is at most `D + (B - D) + S = B + S`; retaining both the prior native payload and its detached copy alongside the second rejected delivery costs at most `2D + (B - D) + S = B + D + S <= 2B + S`. The fixed groups contain at most two sequential native queries. Rejection of the first stops before the second; rejected rows are not detached. Thus one extra rejection-sentinel charge suffices, not one per successful SELECT and not an uncharged row-ceiling overflow.

All five public limits remain explicit positive safe integers. Factory checks preserve `safeSum(R, 1)`, explicitly validate `B + S`, `2B + S`, adding `P`, multiplying by `N`, and `R × S`. Private remaining `b/r` never exceed `B/R`. Since `H >= 203` and `2B + S` is safe, `floor(b/H) + 1` is safely representable; the query also uses `safeSum` for both +1 operations. No production numeric default is introduced.

### Static trigger and edge arithmetic

- Reported trigger `r=100, b=203, H=203`: **L=2**, at most **406 defined logical bytes**, not 100 records/20,300 bytes. Metadata still reports 100 source rows; `100 != delivered 2` rejects the entire group.
- `b=0` or `0 <= b < H`: byte-derived limit is **1**, allowing one bounded rejection metadata record rather than misreporting a nonempty oversized source as empty. `r=0` also gives a single rejection slot. A genuinely empty source still returns zero rows.
- `B=203`, first admitted direct NULL row `D=203`, then serialized rejection `H=205`, remaining `b=0`: prior native + detached + rejected record is bounded by **611**; the factory reserves **2B+S = 766**, plus parameter/concurrency charges.

These are static arithmetic derivations, not product evaluation/native SQL or a unit test. The defined logical native delivery ceiling is **B + S**, and retained native-plus-detached ceiling **2B + S**; it is expressly **not an exact B ceiling** when a rejection sentinel exceeds remaining bytes. No hard driver-wrapper/workspace-memory, cursor, interruption or timing guarantee is claimed.

## Fresh validation and conservation

New evidence root only: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/icon-native-read-byte-20261011/`.

Explicit tools: Node **24.18.0**; Bun **1.4.2**, invoked with `--no-env-file` for **version only**. Both compiler declaration profiles use the genuine TypeScript **7.0.2** sync API under Node. Genuine installed declarations remain Drizzle **0.45.2**, pg **8.22.0**, `@types/pg` **8.20.0**, `@types/node` **24.13.3**, Bun-types **1.3.10**. Original configs/roots/options and public declarations remain unchanged; strict/noEmit/nonincremental/**skipLibCheck false** profiles retain every original Icons package root plus the identical disposable actual-reader/native-signature inventory.

| Check                                    | Actual result                                                                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused allocated-file oxlint, 197 rules | **exit 0; zero warnings/errors**                                                                                                                         |
| Node declaration profile                 | **exit 1; 154 third-party semantic diagnostics; zero local/workspace diagnostics**; other six categories zero                                            |
| Bun declaration profile, Node runner     | **exit 1; same 154 third-party semantic diagnostics; zero local/workspace diagnostics**; other six categories zero                                       |
| Old/new diagnostic comparison            | Third-party diagnostic records compare **exactly equal** in each matching profile, not merely equal counts; raw unfiltered seven-category files retained |
| Static exact source inventory            | **MATCH: 11 source spellings, five ordered groups**                                                                                                      |
| Each profile                             | **2,165 actual compiler-read inputs; 2,078 program inputs; 19 roots**; excluded-path holds empty; post-check input drift zero                            |

The assignability inventory is the original actual five domain readers/full runtime/native callback/Local/service/API type inventory, byte-identical after copying to the new disposable packet. It is not a mocked native reader, request mapping or runtime proof. No strict whole-graph PASS or Bun-executed compiler PASS is claimed.

The actual-FS sync API method transparently records filesystem calls, hashes/copies real inputs as read, rejects repeated-input drift and reconciles them after checking. Current old-compiled-input pins were also checked before the product patch. This is **pre/post pin conservation plus captured actual inputs, not a sealed immutable snapshot certified before execution**. Clean `env -i` supplied only explicit tool PATH/disposable HOME/TMP/NO_COLOR; no env/credential/appdata load or root/path/declaration shim/fallback/pruning.

- All **39 original neighbor/config/manifest/lock/declaration-manifest packet files** matched before and after. All original **2,165 compiled-input pins** matched before; after, only the allocated source has its expected new digest. All freshly captured current compiler inputs match after checking.
- Entire old packet: **13,218 manifest-listed evidence files rehashed before and after**, zero drift; old evidence-manifest SHA-256 remains `3e99f9e6a1e4aac30772b5089f78c1532d74364bf4e679b5def256e3660647c5`. Old source handoff unchanged. No old packet/config/log/helper was rewritten.
- Excluded F, original32 modal-validator graph and original27 request-reader/issuer/authority topics are guarded before metadata/read/hash and were not reached. No excluded current source was captured or compiled.

Raw packet entrypoints: `native-read.before.ts`, `native-read.check-input.ts`, `native-read.freeze.ts`, whole-file `native-read.diff`; `before-pins.json`, `before-neighbors/`, `conservation.json`, `formula.json`; `checks.json`, all stdout/stderr, `tool-env.json`; copied/current `static-driver.mjs`, `assignability.ts`, `inventory.py`, `sql-inventory.json`; both complete profile configs/options/roots/input lists/diagnostic categories/FS logs/input copies. Fresh tool/evidence hashes and handoff capture are finalized in this new packet only.

## Review/activation hold

Return this exact candidate to original Spec and correction Standards/evidence through the coordinator hook; this owner starts no review children or polling. No P2 self-closure, full strict PASS, export or consumer use is asserted. Native atomicApply, actual request/job deadline/admission, logging/trust/COMMIT/private SSR/physical/host/publication and 91-of334 remain held. No other Icons/API/DB/Core/gate/domain/resources/schema/index/service/manifest/lock/export/consumer/host/limit-interface file changed.

No tests, runtime-module evaluation/native SQL, providers/network/browser/listeners/PID work, installs/builds, env/credentials/current appdata, Git/worktree/children, protected3100/3200/live3210/`-g` or older-capture mutation occurred. Both allowed files and the new evidence packet are frozen on return.
