# Native approval candidate execution — inert assembly only

## Actual outcome and scope

**SUCCESS-INERT-CANDIDATE-ONLY.** One first candidate invocation completed with the complete two-line protocol and parent numeric status0. Only the previously absent caller `records/native-approval-candidate.json` was created in C/H/P. It is an inert conditional index, not coordinator publication, native invocation permission, final approval, application boot permission, or actual active-owner proof.

`T=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode`

- C: `T/nitro-native-runtime-caller-o_s9lpod`
- H: `T/nitro-native-runtime-driver-t_05t8qe`
- P: `T/nitro-native-child-compiler-1eywdihu`
- New private evidence stage: `T/nitro-native-approval-candidate-execution-4h_l09k2`; stage/home/tmp/records0700.
- Candidate: `C/records/native-approval-candidate.json`, **21106 bytes**, SHA256 `4f125424509d9a2077b8d2a75b2b17c6b26aabc5004fff4fb240f2b8a850297a`, regular single-link501:20 mode0400. Collector independently opened, hashed, closed and checked canonical DATA, nested release and bootstrap.

The candidate writer used O_EXCL/O_NOFOLLOW0600, bounded write, fsync, fchmod0400, fsync, physical close, then independently opened readback. The actual result records one closed exclusive writer and zero tracked reader/writer FDs. Closure is reported by the executing assembler and independent collector, not a self-future-close assertion in candidate DATA.

## Release, review and source association

The actual parent task explicitly released **one static candidate execution**, expressly excluding native execution and final approval. Before invocation, `scoped-release.json` recorded that release's scope and actual review-message associations; it is a scoped record, not a verbatim capture of the whole parent prompt.

- ENVELOPE ACCEPT: actual read of `ses_eca96dc15ffegmPYyuG119OGlu/msg_136f46cca00162VH2S2g7u6BkX`, conditional on fresh static/source/tool/gate authentication and separate coordinator static release.
- DATA ACCEPT: actual read of `ses_ec92c9612ffeM3qZd0hYXltG1m/msg_136ea661b001pxPzapR0lsJoLa`, binding the unchanged21106-byte proposal and all retained conditions; not candidate-result acceptance or publication permission.
- Selected report: `.scratch/nitro-full-migration/implementation/convergence-native-approval-candidate-envelope-2.md`, **50293 bytes**, SHA256 `741ebd52c1b25f23031d1ae9a39bc156a6bb7905783c86fb56fda26ea1a76461`.
- Full literal: **17261 bytes**, SHA256 `674df0ad507a8c3a8de0cebd44063de38ab60a98d406d85b0cf7b24830a1225e`.
- shlex-decoded Python: **16589 bytes**, SHA256 `a46210c3fd68fe573ae078f9f942e5b73a5418a519b24a9364676cd80e3de78e`; opening newline retained, no strip/lstrip.
- Existing static proof freshly read: `T/nitro-approval-candidate-envelope-v2-checks-899gt4kd/records/final-result.json`, named0600 proof inside private0700 stage/records. Its recorded AST, compile-without-evaluation, zsh syntax0, displayed-DATA equality and zero prior invocations are static evidence, not execution proof. This proof-reader role is distinct from the two named0644 candidate-reference exceptions.

The preparation freshly read/hash-checked the proposal, source/delta associations, named static/review/grant/context/asset associations, complete shared bodies for all eight actual conditional roles, retained author source bytes and all four enrolled tool bytes. It checked author0400, control0700 with empty home/tmp, empty H/output, H input directory0500, record memberships, candidate absence and all seven later absences. It did not duplicate the104 H/P payload loop or read current Auth source. Preparation completed55 reads/3144207 bytes including proof readbacks, under8MiB, with zero tracked open FDs; `preflight.json` preserves individual metadata/hash witnesses and actual physical-close facts. Per-file and aggregate reservations were separately checked before each chunk, including EOF probes.

Fresh enrolled tool bytes matched the retained owners/modes/identities:

| Tool       |   Bytes | SHA256                                                             | Owner/mode   |
| ---------- | ------: | ------------------------------------------------------------------ | ------------ |
| Python3.15 |   34640 | `15c72833c1ffc09bc4e05d1e1866784d126721ad548d9c4d8f943641262535cb` | 501:80 /0755 |
| env        |  167712 | `43eafdf9ffb669ba674d0ef5b48f22bdc8e51535c1c097962f5fbf71f7a3f3cc` | 0:0 /0755    |
| zsh        | 2045440 | `13a613cdf4fa17f60ab6e49989bb768c90c983b45812017d89dd7f946632beae` | 0:0 /0755    |
| Node       |  132848 | `f75a79e4c96954709a130427e452d6720b35c90318ca8293727a4c6376198453` | 501:80 /0555 |

Before the call, exact planned literal, decoded Python, tool options and scoped release/review associations were captured under new records using EXCL0600→fsync0400→fsync→physical close→independent readback. The selected literal was copied directly into **functions.shell**, absolute cwdC, `background:false`, timeout35000. No launcher, script dispatcher, altered Python, substitution, extra environment, pipeline or native control replay was used. Planned source is **not independent actual harness argv attestation**; no such attestation is claimed.

## Actual complete protocol

The direct tool returned normally without reported truncation, timeout, cancellation, missing suffix or extra output. The complete observed response was faithfully copied to `actual-tool-output.txt`; it is not an independently retrieved raw transport capture. No output suffix or status was reconstructed.

```text
NITRO_NATIVE_APPROVAL_CANDIDATE_RESULT {"version":1,"attemptId":"native-runtime-driver-t_05t8qe-matplan01","ownerId":"nitro_native_owner_matplan01","outcome":"inert-candidate-closed-readback-only","candidate":{"path":"/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-native-runtime-caller-o_s9lpod/records/native-approval-candidate.json","bytes":21106,"sha256":"4f125424509d9a2077b8d2a75b2b17c6b26aabc5004fff4fb240f2b8a850297a"},"nestedBytes":17614,"bootstrapBytes":248,"inputFiles":104,"inputBytes":4716264,"closedExclusiveWriters":1,"openTrackedReaders":0,"openTrackedWriters":0,"readOperations":148,"readBytes":7712833,"finalApprovalCreated":false,"runtimeAuthorized":false,"publication":"requires-independent-exact-candidate-review-and-coordinator-publication"}
NITRO_NATIVE_APPROVAL_CANDIDATE_TERMINAL_matplan01 {"version":1,"shellPid":93333,"status":0}
```

The882-byte response has final newlines on both lines; result789≤4096 and terminal93≤512. The unchanged assembler performed148 reads/7712833 bytes, including all104 H payload hashes totaling4716264 bytes before first write, within256 reads/16MiB and the original30s bound. P payloads were not executed. Nested17614 and bootstrap248 satisfy65536/2048 caps; outer21106 satisfies131072. Their SHA256 values remain `285ada0e95e20c7f74015544f3d756d0a731829ee36ca700178db495a18e50f4` and `c4cb3f3a6c951a6be0a4202a27025f10740d99e6250cb06021d8a0e55113249e`.

## Independent collection and receipts

The finite collector read the new candidate once, checked its metadata/hash/DATA/caps, joined current C/records membership against the preflight baseline plus exactly the new candidate, and checked empty H/output and C/control home/tmp. All seven later coordinates remained absent: C coordinator approval, caller claim, caller checkpoint; H native release, attempt claim, child result, outer result. The executing assembler also checked these absences before writing and again afterward; these are finite observation checkpoints, not continuous filesystem surveillance.

Collector completed8 reads/93536 bytes including new evidence readbacks, under8MiB, with zero tracked open FDs. All fresh proof writes were EXCL/O_NOFOLLOW0600→fsync0400→fsync→physical close→independent readback/close. No retry, cleanup, unlink, reset, old-file chmod, root replacement or additional C/H/P write occurred.

Receipts relative to the new stage's `records/`:

| Receipt                        | Bytes | SHA256                                                             |
| ------------------------------ | ----: | ------------------------------------------------------------------ |
| `actual-tool-output.txt`       |   882 | `c374290e40441182677699e445d0fba62e0ace0700c3c817c21a3b8389f88750` |
| `actual-tool-observation.json` |  1763 | `ad9add4fadaf2eed45416fe6093ad131e376e53e82abd1e5fde7734081b12dd2` |
| `collector.json`               |  5596 | `bf891c288a9b22b5497fe51e110908d8f69d1bcd9091e620c16d95f5877af817` |
| `final-result.json`            |  1730 | `b0041722e21879c22d02a6ca59e56b974758fbec185ad139be540a286515c842` |

Also retained: `planned-command.txt`, `planned-python.txt`, `planned-invocation.json`, `scoped-release.json`, `preflight.json`. All receipts are0400. Final result was independently read back and subsequently read with the dedicated file tool.

## Continuing HOLD and next gate

Independent **result acceptance and exact-candidate acceptance** are still required before any separately authorized coordinator publication. Native invocation requires its own later release. No final approval/index override, native Bun, SQL, Engine, network, container, application, private configuration/data, ports3100/3200, compilation, styling, tests, product-source change or nested agent occurred. No runtime, resource/access eligibility, active-owner admission or current Auth compatibility was established.

Prior v1-path HOLD, no-execution/static records, metadata-admission HOLD, historical false flags, old Bun/control/compiler failures, consumed/UNKNOWN/quarantine recovery conditions and remaining timeout/force-policy limitations are preserved. Conditional true authority fields do not establish actual active ownership. This relates only to the unrelated historical435-input generation; current Auth4 frozen/source checks and reviewers remain disjoint. No lint/typecheck was run because this operation changes no product code and explicitly prohibits those workstreams.
