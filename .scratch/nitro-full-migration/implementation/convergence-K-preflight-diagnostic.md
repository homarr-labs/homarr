# K pre-native diagnostic — source-only freeze

Prepared under the supplied Oracle diagnostic-plan approval `ses_ece61e4b3ffeWbV4O1ETRyh5DZ`. Only these new files were authored:

- `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-preflight-diagnostic-ahU6SMf1/records/diagnostic-source.mjs`
- `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-preflight-diagnostic-ahU6SMf1/records/launch-preflight.py`
- This report.

Source is frozen for independent coordinator review, not launch-approved or hash-verified by this author. No command, explicit check, test, compiler, container, SQL/native execution, application/module evaluation, environment/credential/data access, dependency installation or nested agent was performed. Existing input copies and historical records were read only. The padded entry, approval and receipts were not created here.

## Actual baseline, not a guessed diagnostic budget

Read the retained actual host inspect at `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-schema-corefix-X7Z6sEeo/records/inspect-before.stdout`, for container `bfd87a7099d575bad16e50d7fab53ff35c0a76de5d8625d373b73e722e0df37c`.

Its recorded memory and swap are both **1073741824 bytes**, CPU is **1000000000 NanoCpus**, PID limit is **64**, and `/work` is a **268435456-byte** private UID501/GID20 tmpfs. It also records `ShmSize:16834887680`, which the launcher preserves explicitly, alongside the recorded default CPU/reservation settings. These are historical inspect observations, not a live inspection performed here. The request's 128/256 MiB memory suggestion does not match this actual baseline; the source does not silently reduce the resource budget. Coordinator must resolve any intended budget amendment before authorization rather than substituting guessed limits.

The fixed launcher rereads and externally hash-binds that exact baseline receipt. It requires the same pinned cached Bun1.4.2 Linux/arm64 digest/image ID, `/control` cwd, `/usr/bin/env -i`, exactly the original five explicit keys, no `.env`, readonly root, two readonly/rprivate binds `/control` and `/assets/sqlite`, one requested `/work` tmpfs, UID:GID501:20, network-none, cap-drop ALL, no-new-privileges, default seccomp, reviewed default masks/readonly paths, private namespaces, init, core0, TERM10, restart-no, no healthcheck and no logging driver persistence. Image environment is not mistaken for the cleared process environment.

## Diagnostic scope and receipt

The MJS imports only `node:fs`, `node:crypto` and `node:path`. It has no SQLite/Drizzle/native/application/config/credential imports, no compiler, no subprocess/evaluation and no filesystem-writing operation. Only the fixed historical manifest is parsed as data; historical TS, capture and SQL assets are never evaluated or imported.

The first observation enumerates `/work` names and lstat classifications only: at most64 nodes including the root, depth at most5, inventory at most32KiB. Directory descriptors use O_DIRECTORY/O_NOFOLLOW; descendants are resolved through retained directory descriptors, not discovered links. No discovered link is followed and no work file/cache bytes or link targets are read. Descriptor-backed proc directory enumeration is a read-only builtin observation. Bounds, inaccessible/racing paths or unknown parsing conditions produce a critical incomplete observation rather than fabricated emptiness.

The remaining nonwriting corefix preflight sites are evaluated independently: runtime/numeric/groups/invocation/canonical executable identities, exact environment names and per-key value-match booleans, historical manifest envelope/evidence bindings, init/namespace guards, capabilities/NoNewPrivs/seccomp, confined-label or measured EINVAL/ENOENT LSM branch, padded-zero core limits, loopback/routes, canonical/private directories, empty work, mount propagation/allowlist/restrictions/exact identities, init readonly overlay, both masked tmpfs filesystems and exact expected `ro,relatime` options, work flags/capacity/freshness, and the exact original four-name control inventory. The expected policy stays frozen; incompatible actual mask options or Bun-created work entries are reported, not allowed away.

Receipt fields include `observationCompleted`, `preflightSatisfied`, `failedSites`, an array of `{site,passed}`, bounded sanitized actual names/identity/flags, actual mask options next to expected options, and explicit native/SQL/application false plus K withheld. Actual environment values are never emitted; only names and fixed-known-value match booleans are emitted. Ordinary failed prerequisites still yield exit0 when all observations complete. Critical filesystem/parser/bound failures yield exit1 and `observationCompleted:false`. Presence at the first observation is not a claim about which component created an entry or exactly when.

## Coordinator-owned padded entry and freeze

Keep the three historical control copies and all103 assets byte-identical and private0600. The existing copied basename is **`compile-manifest.json`**, not `original-compile-manifest.json`; retain it unchanged to preserve the exact inventory. Its source/output/metafile describe the historical compilation only and never establish diagnostic compilation.

Coordinator generates `control/schema-control.mjs` from the **exact final bytes** of `records/diagnostic-source.mjs`, appending only one pure-data statement `void "xxxxx...";` followed by one newline, to reach **exactly192748 bytes**. No separator, header, bundle/import closure, other statement, changed source or newline normalization is admitted: the frozen source already ends in a newline. The launcher requires an exact byte prefix, suffix matching `void "x+";` plus newline, total byte size, and independently approved hashes. Review the complete generated entry, including the suffix, before any execution. This is filesize calibration above4KiB, not an application/source-compilation result.

Coordinator prepares private0700 canonical stage/records/control/assets/sqlite/meta/home/home/docker/tmp directories; private0600 source/launcher/staging/approval/entry files; empty host `home/docker` and `tmp`; continuous sole-writer input ownership; and independently frozen actual hashes. No work directory is created by the diagnostic.

## Fixed launch approval

Coordinator alone creates `records/launch-approval.json` after independently reviewing final source, final launcher and complete padded entry. Exact keys:

| Key                     | Required value                                                   |
| ----------------------- | ---------------------------------------------------------------- |
| `stage`                 | Exact absolute `nitro-preflight-diagnostic-ahU6SMf1` stage above |
| `sourceSha256`          | Reviewed actual `records/diagnostic-source.mjs` SHA256           |
| `launcherSha256`        | Reviewed actual `records/launch-preflight.py` SHA256             |
| `entrySha256`           | Reviewed actual padded `control/schema-control.mjs` SHA256       |
| `stagingSha256`         | Authenticated actual `records/staging.json` SHA256               |
| `baselineInspectSha256` | Authenticated actual fixed baseline inspect stdout SHA256        |
| `sourceReviewed`        | Boolean true after review                                        |
| `entryReviewed`         | Boolean true after full generated-entry review                   |
| `launcherReviewed`      | Boolean true after review                                        |
| `hostInputsFrozen`      | Boolean true with continuous coordinator ownership               |
| `authorize`             | `one-builtin-only-preflight-diagnostic`                          |

Hashes must be64 lowercase hex; no placeholders pass. Launch invocation must use the exact fixed launcher filename, no arguments, isolated/no-site/no-bytecode Python (`-I -S -B`). No execution is authorized by this report itself.

## Host lifecycle and evidence

The stdlib-only launcher uses lexical Docker argv0 with the separately canonical Popen executable and fixed `--context default`, a private allowlisted host environment, one retained create and no shell/pull/build/retry/restart/remove. An exclusive once-lock prevents reuse. CIDfile and actual create-stream ID are retained/compared; ambiguous creation is not retried. Actual pre-start state requires strict false booleans, OOM false, created/PID0 and zero startup timestamps; `created` is **never** accepted as stopped after a start attempt.

A shared30-second live budget reserves one second for terminal inspection. Every client queues separate bounded streams/statuses/hashes in memory; no input hashing, evidence write or fsync occurs while start may be live. Failures enter shared absolute TERM10 then KILL5 phases, with signal/reap/inspect calls inside each phase, and retain the container without cleanup. Success requires actual exited state, numeric exit0, OOM false, no daemon error, actual startup/finish timestamps, reaped clients, no forced termination and a consistent complete diagnostic JSON. Failed expected prerequisite sites do not prevent diagnostic-observation completion.

Control/assets stat and byte hashes are frozen before create, compared before start and recomputed after established stop. Source/entry/launcher/approval/staging/baseline records are also rechecked. Post-stop envelope and daemon-security checks remain mandatory. `records/result.json` retains actual before/start/after streams, actual pre/post inspections, baseline resource binding, before/after input proofs and diagnostic JSON only after stop/reap is known; failed post-proof can preserve the partial actual proof but cannot pass. Unknown closure emits only a sanitized operational hold with actual call statuses/hashes and retained ID, never raw live-stream persistence or fictitious closure. Total stdout queue is at most5MiB with1MiB closure reserve, total stderr256KiB, at most32 calls, per-call stdout256KiB and final persisted JSON8MiB; the diagnostic itself caps output128KiB.

## Remaining coordinator steps only

1. Review these frozen source bytes and the actual baseline resource discrepancy; any amendment requires new review, not an unreviewed budget substitution.
2. Generate the exact data-padded192748-byte entry, review all bytes, authenticate staging/baseline and historical106 input pins, normalize private permissions and independently freeze all hashes.
3. Create the exact approval above only after the independent gates pass; review isolated launcher invocation and retained-container operational recovery.
4. If separately authorized, run **one builtin-only diagnostic**, retain actual stop and before/after frozen-input evidence, and interpret failed sites as prerequisite observations rather than K acceptance.

No metadata retry, sixth environment key/cache fix, native migration, SQL execution, product/application boot or K/D release is authorized. All existing holds remain.

## Approved two-repair launcher amendment — source-only freeze

Changed only the fresh unrun stage's `records/launch-preflight.py` and appended this handoff. The accepted `records/diagnostic-source.mjs` is untouched. No commands, checks, tests, evaluation, container/native/SQL execution, environment/data/secret access, other-file writes or nested agents were performed; no approval, generated entry, once-lock or container was created by this amendment.

1. **Phase-bound OOM metadata:** `envelope` still requires a present, exactly boolean-false `OomKillDisable` before start. A recorded `prestart_policy_accepted` flag is set only after the strict pre-start envelope/state and frozen-input proof succeed. The post-stop envelope call can accept a present value of only `null` or exactly boolean-false only when that flag is true, the accepted before-inspect identifies the retained CID, and the actual after-inspect has already established that same CID stopped/reaped and terminal (`exited`/`dead`, not `created`). The envelope independently rechecks terminal stopped state for this narrow phase exception. Missing keys, true, numeric0, unaccepted before policy and nonterminal state receive no exception.
2. **Bounded cleanup call reservation:** the existing Docker runner retains the global32-call cap but normal/TERM calls stop at24, reserving eight actual call slots for KILL/terminal inspections/post-stop work. TERM performs at most six inspections with1.5-second intervals inside its shared absolute10-second phase; KILL performs at most four inspections with1-second intervals inside its shared absolute5-second phase. KILL signal/inspection calls use their separate30-call ceiling, so exhaustion of the ordinary24-call allowance does not skip KILL; two slots remain reserved, and the existing post-stop daemon call uses the global32-call ceiling only after established stop. Each client reap remains inside its existing bounded call/phase allocation. No extra native wait, retry loop, live persistence or framework was added.

All resource settings (1GiB memory/swap and measured default shm), five-key environment, mount/network/capability/no-new-privileges policy, pins, CID/once handling,30-second watchdog and TERM10/KILL5 bounds remain unchanged. This freezes the two-fix diff for source rereview, not validation or launch approval. Coordinator still owns exact192748-byte padding, complete generated-entry review/AST/hash gates, frozen host/input hashes and separate one-diagnostic launch authorization. No sixth key, new metadata/SQL attempt, adoption or product release is authorized.
