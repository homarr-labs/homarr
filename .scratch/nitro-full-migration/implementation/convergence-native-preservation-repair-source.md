# Preservation DB repairs — source freeze, not SOURCE ACCEPT

Implemented the three independently approved cuts in **only** `packages/db/runtime-preservation.ts` and `packages/db/runtime.ts`. Public capture/encode/dispose/type ports and complete-record format/limits are unchanged. Gate/shared K/unit/COMMIT/publication, SQL/assets, manifests, Core/Auth/API/MAIN and other product files were not edited.

## Frozen bytes / lineage

Fresh private0700/exclusive0600 receipts: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-native-preservation-repair-source-msaj9hc1/` (`before/`, `after/`, `diffs/`, `pins/{before,after}.json`). Bounded isolated Python source-file/hash/diff IO matched all original `bxl3v1_p` source images before editing; historical module `64115816…`, runtime `602444c2…`, gate `a603a0f0…` and old check receipts remain untouched.

| New frozen source                     | SHA-256                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `packages/db/runtime-preservation.ts` | `c34d0a108f0c9ba4bfe953b9036f9df9c28e2250d42070ee5d853c869b79c435` |
| `packages/db/runtime.ts`              | `9c2de970e502375fc1ed599b456c30fad387849139935e97ed2910e3a4c2a004` |

270 captured protected images, including the previously leased gate and original protected joins, remained byte-identical. This is source-byte evidence, not executed retention/transfer/cleanup or new compiler acceptance. Coordinator's historical 25/type/lint/format0 at `v74wt2bu` is not a check result for these repaired bytes.

## 1. Scalar resource fence before initial K

Actual fixed native callback now authenticates/retains the captured-root SQLite bundle and count51 under original clock/currentness checks, then calls internal-only `assertSqlitePreservationLedgerTransferBounds(client, clock, assertCurrent, quarantine)` **before** first `assertCurrentSqliteTarget`. The helper is imported internally, not reexported through `@homarr/db/runtime`.

Its fixed LIMIT52 query transfers only native storage/length scalars for hash and created_at: hash TEXT raw BLOB-cast byte length; created_at NULL0/INTEGER CAST-TEXT length/REAL8/TEXT BLOB-cast length/BLOB length. No actual hash/value/id, substring, truncation, pointer, filter or caller projection crosses this fence. It observes row52 and rejects overflow; checks existing 1MiB TEXT/16MiB BLOB/20MiB row/64MiB aggregate limits, including row/cell prefixes and actual-count fixed ledger-table framing, before K payload admission. Original/unit checks bracket native prepare/steps/visits/finalization.

This is a **resource guard only**. Under-count is left to unchanged K, which must still validate exactly51 actual rows, pinned hashes/timestamps and full physical target. Then the unchanged complete-record producer and second K operate in that same no-business-DML unit, with final bundle identity/currentness/post-native checks. No new catalog DDL/pragma before-materialization guarantee is claimed outside the physical-record projection. No gate or shared K behavior was changed.

## 2. Actual returned-view erasure

`collectRows` retains actual `step.value` immediately after native `.next()`, before its post-step check. Post-step check, done handling, own-record validation, visitor and post-visitor check now have a per-row catch/finally. Body cause is retained first; nonexported `eraseNativeReturnedRow` always runs, without a budget/abort gate.

The helper inspects only that actual native row's own property keys/descriptors and fills **original** Uint8Array/Buffer data-property views through the Uint8Array primitive. It covers unprocessed cells/identity probes as well as processed payloads, without getters, copied-view substitution, recursion/error-graph traversal or caller buffers. Per-key descriptor/fill faults accumulate and quarantine while other discoverable views are attempted; quarantine failures are retained without masking the original cleanup cause. Enumeration failure is retained, not misrepresented as completed erasure.

Any retained fault stops further row admission. Existing iterator.return, statement.finalize and final-clock cleanup still run; aggregation remains once at `collectRows` exit, body-first with original fault identity deduplication. Successful detached row/frame copies remain independent of wiped native views; existing owned-copy/frame cleanup is intact. Native-next failure before an accessible yield does not imply erasure of hidden engine allocations. No GC/RSS or executed privacy proof is claimed.

## 3. Resource-free owner association

`createPersistenceRuntime` now creates one private frozen empty `preservationOwner` token, distinct from onboarding's owner. Actual prepare and publish receive this **same** token instead of the retained Connection. Prepared/published registries still enforce exact owner identity; the owner field contains no config/client/clock/callback/signal graph or public accessor.

Actual native dispatch, K/epoch/currentness, original lifetime/timing and postguards still use the real retained Connection in the physical task. Token equality is not SQL authorization or a substitute for those checks. The observation retains its existing original clock/private frame; its owner no longer pins the Connection/native/database graph. No new identity type/framework/helper file or public contract was added. Executed retention validation remains deferred.

## Handoff / holds

Freeze for coordinator fresh exact-byte checks and independent representation/native/lifecycle rereview. No compiler/lint/formatter/check command, product evaluation/import, test, SQL/native/Engine/network operation, sensitive fixture/private configuration/data access, nested agent, commit or push occurred. Only the two source patches, this NEW report and released bounded Python source IO were performed.

MAIN C/transport/installer implementation and its DB gate remain separate. Genuine source/copy/seal provenance, same-candidate sealed-byte readback through exact EOF plus settled close, original-total supervision, native red-green/retention/oversize fixtures, memory initialization/adoption, runtime/restart and all real restore/cutover/ports3100/3200 authority remain held. No historical native success or old compiler receipt is reused as current acceptance.
