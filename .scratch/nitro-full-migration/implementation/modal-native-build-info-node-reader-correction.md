# Modal native build-info reader — exact three-P2 source correction

## Return — source candidate only; complete OriginalM rereview required

**The three allocated corrections are authored in the existing reader/contract coordinates, with complete original and corrected text images plus literal diff/scope controls in fresh approved TEMP. Nothing was executed, hashed, target-inspected or independently accepted here. OriginalM must rereview the complete corrected bodies; this handoff does not self-close any P2 or authorize prelaunch/execution.**

Read latest ROSTER368/progress209, full102-line original handoff, full1078-line reader/173-line contract and OriginalM's complete final findings from `ses_ed40f98f4ffeNuSbuiKGv0hgAz`. The accepted remaining parser/layout/grammar scope was not reopened. Sole repository handoff collision-glob returned absent again immediately before creation; fresh TEMP collision-glob returned absent before preservation.

## Complete bodies /diff /control coordinates

Edited existing coordinates only:

- `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-native-node-reader-source-20261011-S6q2Ln/tools/build-info-reader.mjs` — corrected1219 lines reported by read tool.
- `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-native-node-reader-source-20261011-S6q2Ln/reader-contract.json` — corrected176 lines reported by read tool.

Fresh evidence root: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-native-node-reader-correction-20261011-P8m4Rs/`.

| Exact relative evidence path       | Retained material                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `before/build-info-reader.mjs.txt` | Complete original1078-line reader retained before correction.                                                       |
| `before/reader-contract.json.txt`  | Complete original173-line contract retained before correction.                                                      |
| `after/build-info-reader.mjs.txt`  | Complete corrected1219-line reader text image, not excerpts.                                                        |
| `after/reader-contract.json.txt`   | Complete corrected176-line contract text image.                                                                     |
| `source-contract.rawdiff.txt`      | Complete217-line manually authored literal patch-language source/contract delta; no executed diff or replay.        |
| `scope-controls.json`              | Literal edited/evidence coordinates, preservation method, exact three behaviors, invariant controls and exclusions. |

Preservation used patch Move-to operations into the before text-image coordinates **before** any fix, then recreated the original tool/contract coordinates with corrected complete bodies. After-images were transcribed through patch from the read corrected bodies. This is file-edit/text-image preservation, not an executed copy, hash, readonly-mode witness or seal. No computed source/contract pin or machine-verified byte-equality claim; full images and actual current tool/contract are the review inputs. No original handoff/reference/history edits.

## P2#1 — single-link input gates

Original394–403 admitted matching multiply-linked input. Corrected reader531–542 now requires path `nlink === 1n` in regular/no-symlink/exact-size admission, then independently requires opened owned-descriptor `nlink === 1n` alongside `sameFile` binding. Both gates precede `Buffer.alloc(SIZE)`/all input reads. Existing exact size, opened-byte hash, no-follow, regular-file and endpoint/parent checks remain.

Corrected515–519 also requires single-link path and descriptor in conservation. Matching multi-link samples therefore cannot turn a rejected descriptor into unchanged-input evidence during finalization. Contract `input.identityPolicy` mirrors the literal requirement. No target copy/chmod/write or new target observation occurred.

## P2#2 — independent sinks /non-suppressing guarded finalization

Corrected228–281 attempts stdout and the active owned ledger independently. Each sink has its own admission/budget/write attempt; stdout failure does not skip the ledger, and ledger failure does not suppress stdout. Actual attempted/complete/failure outcomes are separate; failed budget/admission is not falsely called a write. Preparation failure is distinct from sink failure. Failure records append directly to `secondary`, without calling emit recursively or retrying a failed sink.

Normal phase still stops on evidence failure, **after independently attempting each available admitted sink**. Once finalizing, sink/preparation failures remain recorded but do not throw from emit into otherwise separately admitted/fenced conservation/artifact/flush/close attempts. This changes evidence-failure control flow only: `io` still performs admission first; parent/output/input identity guards, descriptor ownership, artifact bound and unsafe-operation STOPs still throw. No catch-all permission bypass or parser continuation is added.

Finalization I/O-intent emission attempts are retained in `finalIntentAttempts` even when their bytes cannot be written: sequence/stage/requested operation plus each available sink's actual attempted/complete/failure state, or preparation failure. Receipt snapshots and final post-receipt/cleanup registry carry these observations; no intent is described as durably written merely because an in-memory attempt exists. Primary outcome includes already retained secondary failures. I/O primary exceptions remain the original thrown exception; sink/receipt failures never replace them.

Acquisition registry, actual descriptor close attempts, uncertain-close status/no fd retry and final registry ordering remain unchanged. Any sink/preparation failure adds secondary evidence and prevents exit0; result/native decision remains HOLD. Both sinks failing still limits durability. Pre-bootstrap stdout and post-ledger-close final stdout still require independent runner capture; closing the ledger is not represented as a surviving sink. Attempted-byte counters are not claimed actual committed-byte totals after partial write errors.

## P2#3 — aggregate bound before artifact JSON/string/buffer

Corrected125–213 adds a local count-only `artifactBound` for the reader's own simple data; corrected455–463 calls it **before** `json(value)`, newline concatenation and `Buffer.from`. No generic serializer, addon/dependency, callback/eval or new import. The existing postconstruction check remains and additionally requires actual bytes not exceed the computed bound.

The defining logic starts with one byte for newline. Every charge checks a safe nonnegative integer against remaining8MiB budget **before addition**. It traverses actual nested occurrences, not a promise based on independent field maxima: repeated references are counted each time; active-ancestor cycles HOLD. Objects/arrays add delimiters, each emitted key/string/value, colon and comma; undefined object members are omitted as in the existing JSON replacer, array undefined charges null4. Dense own-data arrays only; unsupported shapes, accessor descriptors, own/inherited toJSON hooks, symbol keys, unsupported prototypes or depth>32 HOLD without invoking getters/toJSON.

String/key charges include both quotes and each JSON/UTF8 unit: quote/backslash/short-control escapes2, other control/lone-surrogate escapes6, ASCII1, two-/three-byte UTF8 as applicable, paired surrogates4. This covers error/control text too; it does not broaden the accepted ASCII module parser. Finite numbers charge conservative32 bytes; booleans5; null4; BigInt within +/-MAX64 charges23 for quoted decimal/sign. Every nested record/hex/string/property/punctuation/newline participates in the same checked aggregate bound.

Exceeding bound/shape/depth stops before constructing that aggregate JSON string/buffer or acquiring its artifact file. Existing partial ledger/receipts remain; the existing artifact catch records HOLD and independently attempts later admitted receipts/cleanup. This is an artifact serialization bound, not a claim that all intermediate descriptor tables, strings, existing event serialization or overall process memory are bounded by8MiB. Existing4MiB event/64MiB sink caps and1MiB finalization reserve are not weakened.

## Frozen scope /remaining holds

Node `/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node` /acceptedSHA `ee6fb0e015284d83a91e8ec5213f43a157f8a392b58555301682892ba928c04a`, sole future input23,653,616bytes /acceptedSHA `a82f731365ad69d5c4c15f5e18fba4584bf3b7b839960172a76c3462b5114bf2`, three builtin imports, exact literal prefixes/operations, five-artifact scope, output/control/argv/env coordinates and loader/runtime guards are unchanged. Full exact coordinates remain in both contract images and scope controls. No future input/output/control coordinate was probed or created.

Remaining accepted thin64/both-endian/inline/unique named-section/checked arithmetic/Uvarint/ASCII grammar/layout/sentinel logic was not refactored or expanded. No whole-tool cosmetic rewrite/comments/tests. Original102-line handoff, seven Go references and all six failed M packets/partial receipts/originals/history/seals remain untouched. Current DB prelaunch/StringDecoder assets/F/Auth/Icons/native graphs were excluded before metadata/read/hash/copy. No product/dependency/SQL/provider/browser/listener/PID/Git/worktree/child/live3100/3200/3210 actions.

No command, Node/script/parser evaluation, hash, lint/typecheck/test, target metadata/read/inspection/execution, network or child action occurred. Static source text reads/file patches only; no executed rawdiff/seal verification. Exact ESM entry and builtin/native startup closure before assertions remains a separately allocated future prelaunch problem, not research permission now.

Next is OriginalM **complete corrected source/contract/diff/control rereview**, including the actual aggregate-counting logic and independent-sink/finalization error paths. No self-P2 closure or prelaunch/execution/target/native-provenance/native-body/.tsx-class/semantic/type/consumer/native/host/J5/COMMIT/privateSSR/publication/91-of-334 clearance. Hook-only.
