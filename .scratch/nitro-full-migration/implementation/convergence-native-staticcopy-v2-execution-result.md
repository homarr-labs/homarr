# Staticcopy-v2 fresh preparation: source-read guard HOLD, copier uninvoked

## Actual terminal result

**Fresh outer preparation exited1 with `RuntimeError: extra-read-budget` in a selected P-source read. Copier invocations0; no C/H/P mutation.** The coordinator's corrected protocol and outer-proof-reader distinction were applied. The previous wrong-label and0400-helper HOLD reports/evidence were not modified or replayed.

The failing predicate was:

```python
need(size <= cap and read_bytes <= 8388608, "extra-read-budget")
```

It ran inside `take` during the104-source loop. Its failure does **not** uniquely identify whether the individual source-size cap or aggregate8MiB cap was exceeded. Exact current source path, per-file size counter and aggregate byte counter were not emitted. They remain unavailable/null; I did not reconstruct them from later filesystem samples or invent a complete source-read receipt.

The guard checks **after** reading a chunk, bounded at65536 bytes. Accordingly this result does not establish successful aggregate8MiB compliance, and its fail-stop guard is not a proof of never reading beyond that budget. No successful fresh copier gate or complete preflight is claimed. No cap increase, automatic helper repair/rerun, alternative root or copier invocation followed.

## Preparation actually reached

The helper exclusively allocated the new outside stage and its home/tmp/records0700, then checked the selected report/literal/shlex-decoded Python expected pins. Python's opening newline was preserved; the original candidate source was neither rewritten nor evaluated.

| Selected source  | Bytes | Expected SHA256 checked before the later failure                   |
| ---------------- | ----: | ------------------------------------------------------------------ |
| Report           | 40152 | `b8aeef58e1f31b1f5364e49c15c2635b602d73d0d9fc8f258576ece5c0280c91` |
| Complete literal | 29949 | `5741874ba53d38bca15ac6e1cc2ec7f1a65b4083440de4467c42f9aba0aa51da` |
| Decoded Python   | 29308 | `8d66031ae0d48a4b2fbd70c68afdc7da316611a20bb47fea64a9670e7019de21` |

The outer `proof` reader was separate from the candidate `reference` helper. It accepted only observed0600/0400 for the selected named read-only proof leaves, with nofollow/regular/nlink1/501:20/canonical private700-stage/strict-JSON checks. The retained static-check leaf was freshly read at0600 and joined to coordinator observation and pin1831/`24b5e1d64d89f5d64b2dcba31158e2fc2e813f0c911b85cc4976138016f293c9`. No historical receipt chmod or global candidate-mode weakening occurred. Candidate references remained0600 except the two exacthash-bound0644 private-stage contracts; authors400 and enrolled tool modes remained distinct.

Control flow reached the source104 loop after selected static source/syntax associations, lease documents, metadata physical-history joins, current author400/private-control700/emptiness checks, initial destination/later-coordinate absences, author/reference/tool joins, compiler indices, exact fence identities and static asset/journal/layout authority checks. These were **partial preparation checks**, not returned frozen receipts or accepted complete preflight. Some source reads preceded the failing source read; no exact successful source count was returned. The postflight, evidence/release/planned-invocation writes and final ready frame were not reached.

Thus C/H/P **were read**, unlike the previous preparation failure, but no C/H/P file/directory/chmod/copy operation occurred. No copied file, native-envelope candidate or static-materialization record was created by this executor. The104-source/104-copy/106-writer/400-and500-input/empty700-output oracle remains unrun.

The required actual protocol is unchanged: `NITRO_MATERIALIZATION_STATIC` followed by `NITRO_STATIC_TERMINAL_matplan01`, numericstatus0. No actual candidate tool request/result/parent status exists, and none is inferred from a planned source or static check. No direct candidate invocation, launcher/substitution/heredoc/extra candidate environment or source-line reorder was used.

## New frozen stop evidence

`TEMP=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode`.

Stage: `TEMP/nitro-native-staticcopy-v2-execution-c8e49af7715f08eb`.

The complete visible preparation return comprised the initial allocated-stage JSON line, traceback and `Exited with code 1`. It was not truncated. The collector preserved that complete displayed text, including final newline, rather than reconstructing missing fields. This is a visible-return transcription, not independently obtained raw stdout/stderr channels or harness argv.

The stop collector inspected only its own stage/home/tmp/records. All four were canonical501:20/0700; home/tmp/records were empty before stop-receipt writes. The two following leaves were exclusively written0600→fsync→fchmod0400→fsync→physical close→independent exact readback/hash→close, regular501:20/nlink1/0400:

| `records/` leaf                     | Bytes | Actual SHA256                                                      |
| ----------------------------------- | ----: | ------------------------------------------------------------------ |
| `preflight-visible-tool-return.txt` |   750 | `f11d9a84ab1b5f00ccc7000a55577e8330039c1f1be220732ef4cf89db0adbf3` |
| `preflight-stop-result.json`        |  4583 | `97aa42c28d0aadcb6db6b4eb6ae94828749a5a14dbfc00beecfe4d433f6b526c` |

Actual returned collector frame acknowledges two closed evidence writers and zero tracked readers/writers, including physical close/readback of its own last JSON writer. The JSON does not self-attest its future close. Collector-only readbacks5333 bytes are known separately; failed-preparation aggregate read bytes remain unknown and compliance is not asserted.

No successful preflight/release/planned-command/source-submission receipt was created. Original helper in-memory source/tool/reference/source-file receipts were not returned or persisted before its exception. Earlier accepted/static/historical receipts cannot be relabelled as this fresh preparation's completed result.

## Held disposition

Metadata exact source equality remainsfalse and its two-bookkeeping-line admission deviation remains permanentlyHOLD; its acceptance is physical facts only. No replay/undo or retroactive exact-source approval occurred. Old `48ab8aa096e97aa9`, `fd2ef4a106f4de02`, control/artifact/Bun attempts and protected data remain unchanged.

This is **HOLD-fresh-preparation-read-guard-before-FIRST-copier**, not a copier success or native release. Coordinator retains the failed external preparation allocation and reconciliation ownership. Independent result review is required before any continuation; no automatic callback repair, repeated helper, cap increase, copy retry, reset/cleanup or alternate C/H allocation is authorized by this result.

No SQL/Bun/native/evaluation/Engine/network/container/application/enrollment/data action, approval/runtime claim, final index/grant writer, source-product/test/check edit or nested agent occurred. Wire/native-expiry/preservation planning lanes remained disjoint and were not contacted or delegated to. Actual harness argv and hidden tool-channel facts remain unavailable.
