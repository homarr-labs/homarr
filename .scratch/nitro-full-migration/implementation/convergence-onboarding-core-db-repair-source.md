# CORE DB TEXT repair — frozen sole-file handoff

**Implemented/frozen, not SOURCE ACCEPT or Bun compatibility proof.** Only `packages/db/runtime-onboarding-read.ts` changed under the approved `convergence-onboarding-core-db-text-repair-plan.md`, including its already approved URL lint cut. Original `fe5a72f7…` / `d9525yh8` source/report/receipts, native acceptance and historical25 types/format pass/lint1 at `z_5vtwtq` are preserved, not rerun results.

## Actual source cut

- `CoreReader.payload` now wraps the **original fixed query** with a local SELECT. Each fixed TEXT alias is `CAST(core_source."alias" AS BLOB)` under its original name, accompanied by original `typeof` and native byte-length aliases `__core_t<index>` / `__core_b<index>`. Integers pass through. Bindings, inner ORDER/LIMIT and cardinality remain unchanged; no filtering, substring, truncation or raw/values acquisition lane was introduced.
- Original preflight still examines the original query's TEXT/nullable-NULL storage, native bytes/count/overflow and aggregate/framing/JSON escrow before byte payload. The only additional preflight guard rejects uninitialized encoding. Native payload keys must exactly match the fixed base+auxiliary key set. Original BLOB storage cannot pass by virtue of the transport CAST; NULL requires NULL payload/length, and zero-byte TEXT remains distinct.
- New **private** `decodeNativeText` requires the actual original returned Uint8Array/Buffer view, safe supplied native length equal to its byteLength, existing raw/conservative UTF-8 bounds and initialized observed encoding. It performs no byte copy or view escape. Clock/currentness checks bracket complete decode/string allocation and existing code-unit/UTF-8/NUL validation.
- One actual PRAGMA encoding observation initializes builtin `node:util` TextDecoder with the exact UTF-8/UTF-16le/UTF-16be label, `fatal:true`, `ignoreBOM:true`; reported label/options must match. No encoding default/fallback/BOM sniff or manual codec. Each field decodes with `stream:false`; UTF-16 odd length rejects. U+FEFF is preserved, not stripped; no replacement or normalization path was added.

The local adapter covers initial/final step id/step/previousStep, Everyone homeBoardId, board id/name/colors, universal epoch including post-native settlement, stored claim JSON and all existing fixed credential-policy TEXT aliases. It returns only the original logical string/null/integer fields. The credential generator/decoder and storage/sequence/grant/expiry proofs are unchanged; no raw-byte claim is made about SQLite's generated CAST/typeof expressions before the selected alias boundary or other callers of those algorithms.

Existing private row/claim/epoch/credential witnesses now consume these strict decoded strings in both initial and final observations. Auxiliary tags/views are not fingerprinted as a new DTO or published; no new expected hash/baseline/registry/public facts getter was introduced. JS configuration/input text and canonical native clock/metadata scalars keep their original validators. Shared K/catalog/history acquisition remains outside this repair.

## Ownership / cleanup / lint

Decode stays inside the existing row visitor, before its unconditional erasure finally. Decoder/post-decode-clock/row faults stop admission with the actual primary cause; all original Uint8Array own-data views, including unprocessed cells, still receive erasure attempts. Existing return/finalize/clock/rollback/busy restoration/quarantine and distinct cleanup handling are byte-identical. No invalid→empty/null/deny/start widening, fresh budget or privilege relaxation. Detached strings survive retired views; no GC/RSS/hidden-engine memory deletion is claimed.

The approved URL-only lint correction replaces the control regex with a bounded charCodeAt loop rejecting<=32 or===127 after existing4096/nonempty/trim checks. URL credentials/query/fragment/origin rules and returned value remain unchanged. No Array.from, suppression, warning cleanup, comments/tests/casts/non-null assertions/dependency/manifest/signature/export change.

## Freeze receipts

Private0700/exclusive0600 root: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-core-db-repair-source-f_16zdja/` with exclusive `before/`, `after/`, `diffs/`, `pins/{before,after}.json` source images. All original frozen images matched before editing.476 protected images remained byte-identical: original473 protected joins, runtime, gate and original source handoff.

Frozen repaired module SHA-256: `7b75957a5833514d7fae7a68632f19c191d993afca4a15a017a867a58422cf4e`.

Protected same-module byte spans confirm unchanged public types/error declaration, capture/authority/configuration/clock, field/budget/erasure code, native `each` cleanup, and the complete fixed-field/query/policy/body/witness tail. Runtime remains `b06291b1…`; gate remains `64f5a220…`. No acceptance/progress roster was used as immutable source authority.

## Source cases / remaining holds

Malformed UTF-8 (80/truncated/overlong/surrogate encoding), odd or unpaired UTF-16, both explicitly observed endiannesses, valid leading BOM, NULL/empty distinction and a post-decode check failure are **source-path requirements**, not executed cases. Unsupported/mismatched decoder mode fails closed. Bun malformed-TEXT-to-string behavior, CAST-to-BLOB view behavior, UTF-16/fatal/ignoreBOM implementation and physical cleanup remain unexecuted; declarations are not runtime evidence. Intentional encoded U+FFFD is not blanket-rejected. Old first-memory435 artifacts are not evidence for this producer.

Only source patching, readonly declarations/source reads and released bounded isolated Python source/hash/diff IO occurred. No compiler/lint/formatter/check command, product evaluation/import/test/native SQL/Engine/network/Context7/private configuration/data access, nested agent, commit or push. Fresh focused DB/Auth/API/Backend/Nitro types + DB3 lint/format and native/projection rereview belong the coordinator after freeze.

Auth admission/CoreRoot birth, genuine configuration, SSR/delivery/enrollment, PostgreSQL, installer/server/runtime/FS/real-data/restore/cutover and full application completion remain held. This changes the real local source acquisition body, not those permissions or public ports.
