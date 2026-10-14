# K launcher fixed producer contract — source-only amendment

Amends only fixed-stage `records/launch-schema.py`; creates only this report. The prior launcher report is preserved. No command, parse/check, test, compiler, Docker/native/SQL execution, environment/data/secret access, control/manifest/asset write or nested agent occurred. Control ownership remains separate and active. This amendment implements the supplied Oracle authorization `ses_ece61e4b3ffeWbV4O1ETRyh5DZ`; it is not a completed independent byte review or permission to launch.

## Exact approval schema

Coordinator independently authenticates and freezes `records/launch-approval.json`. Its top-level keys are **exactly**:

| Key                             | Required value                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `stage`                         | `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-schema-capture-iLcFdopr`                                           |
| `referenceSha256`               | `a675179f6c33bf71c4fc4318da73299e2345eaa4a49b90854260fb9fe9c8d868`                                                                          |
| `launcherSha256`                | Independently reviewed actual launcher SHA256                                                                                               |
| `controlSha256`                 | Exactly four basename-to-SHA256 entries: `schema-control.ts`, `schema-control.mjs`, `compile-manifest.json`, `whole-source-asset-pins.json` |
| `evidenceSha256`                | Exactly six basename-to-SHA256 entries listed below, binding original stdout **and externally observed CLI status bytes**                   |
| `defaultMaskedPaths`            | Independently reviewed complete actual daemon-default masked-path array, preserved exactly by both live inspections                         |
| `defaultReadonlyPaths`          | Exactly ordered `/proc/bus`, `/proc/fs`, `/proc/irq`, `/proc/sys`, `/proc/sysrq-trigger`                                                    |
| `sourceReviewComplete`          | `true` after actual source review                                                                                                           |
| `launcherReviewComplete`        | `true` after actual amended launcher review                                                                                                 |
| `compileClosureReviewComplete`  | `true` after actual compiled closure review                                                                                                 |
| `inputDependencyHashesVerified` | `true` after resolved-input/dependency byte proof                                                                                           |
| `metafileVerified`              | `true` after actual compiler metafile review                                                                                                |
| `hostInputsFrozen`              | `true` with continuous coordinator ownership/no concurrent writers                                                                          |
| `launchAuthorized`              | `true` only following the required independent reviews                                                                                      |

The six evidence files are `original-runtime-prerequisites.stdout`, `original-runtime-prerequisites.exit`, `cached-security-probe.stdout`, `cached-security-probe.exit`, `daemon-security-options.stdout`, `daemon-security-options.exit`, all under this stage's `records`. Each exit file must contain actual external CLI `0` with optional newline. Coordinator must byte-preserve/authenticate the original prerequisite receipt; the launcher neither synthesizes a replacement nor demands fictional control/container exit statuses for an earlier auto-removed probe.

Original prerequisite stdout must actually report Bun1.4.2, Linux/arm64, `/usr/local/bin/bun`, initName `docker-init`, numeric UID501/GID20, `cleanEnvironment:true`, `sqlExecuted:false`, `applicationBooted:false`. Its clean-environment flag joins the independently reviewed original five-key invocation, not an invented environment measurement.

Cached security stdout must actually report canonical regular nonsymlink `/usr/local/bin/bun`, `/usr/bin/env`, `/usr/sbin/docker-init` and that measured initPath; `/proc/self/attr/current` EINVAL and the three supplied LSM-discovery paths ENOENT; exactly one read-only tmpfs observation for each `/proc/asound` and `/sys/firmware`. Daemon security stdout must be exactly `['name=seccomp,profile=builtin','name=cgroupns']` as JSON. This establishes **default LSM not applicable**, never a claim of LSM confinement. Default seccomp remains mandatory.

All nine known default masks are mandatory: `/proc/acpi`, `/proc/asound`, `/proc/interrupts`, `/proc/kcore`, `/proc/keys`, `/proc/latency_stats`, `/proc/timer_list`, `/proc/scsi`, `/sys/firmware`. The separately frozen complete default array may also contain the recognized default entries `/proc/timer_stats`, `/proc/sched_debug`, `/sys/devices/virtual/powercap`; no arbitrary names or CLI mask overrides are admitted. The actual array must equal the complete approved policy, before start and after stop, not merely contain the two newly recognized tmpfs paths. The two masked tmpfs paths are restricted system masks, not additional application mounts.

## Reviewed compilation-manifest join

`compile-manifest.json` is the exact fourth control file, not `compilation-provenance.json`. Its independently pinned bytes must retain actual source/output/dependency/metafile provenance. `source` and `output` require actual staged absolute `path`, numeric `size`, and matching independently frozen SHA256 for TS and compiled mjs respectively. The manifest is evidence bound by external review, not self-certification.

Coordinator/control owner separately adds the exact `runtimeEnvelope`:

```json
{
  "initPath": "/usr/sbin/docker-init",
  "defaultMaskedTmpfs": ["/proc/asound", "/sys/firmware"],
  "defaultLsm": {
    "kind": "not-applicable",
    "daemonSecurityOptions": ["name=seccomp,profile=builtin", "name=cgroupns"],
    "evidence": {
      "daemonStdoutSha256": "<actual daemon-security-options.stdout SHA256>",
      "daemonExitSha256": "<actual daemon-security-options.exit SHA256>",
      "securityProbeStdoutSha256": "<actual cached-security-probe.stdout SHA256>",
      "securityProbeExitSha256": "<actual cached-security-probe.exit SHA256>"
    }
  }
}
```

These four hashes must equal the externally authenticated approval evidence hashes. No actual hashes, statuses, byte-review results or successful probe were invented in this report. Docker `info` SecurityOptions is independently reread before the one create and after actual stopped state, requiring the same exact two-element array.

## Fixed final producer receipt

No `REQUIREMENTS`, `finalReceiptPaths`, mapping framework, success-field replacement or inferred constant control exit remains. The launcher consumes the producer receipt unchanged:

- `kind:"synthetic-sqlite-schema-metadata-observation"`, numeric `version:1`, `observationComplete:true`; `outcome:"hold"`, `productAdmission:"withheld"` stay intact.
- `primary.state`, `preProof.state`, `postProof.state`, `migrator.state`, `native.strictClose.state` are all `"completed"`; `native.cleanupFaults` is empty; `native.migrationAttempts` is actual numeric1.
- `metadata` and `metadata.ledger` are present objects; ledger `matchesPinned51:true`, `count:"51"`, exactly51 object rows.
- `inputs.captureSha256` equals the trusted capture reference; `inputs.control` contains the exact four named control pins and exactly one `path:"schema-control.mjs"` entry whose numeric size/hash equal the externally frozen compiled file.

Actual numeric exit evidence comes from the retained start CLI status and actual inspected container/init-control-process exit; no independent control exit receipt field is manufactured. The start CLI must actually exit0; the retained container must actually be exited/stopped with numeric exit0, no OOM, no daemon error, no forced termination, and reaped clients. Full bounded capture/ledger/pin-proof/strict-close semantics are still obligations of the separately reviewed actual producer bytes.

## Watchdog and persistence repair

Docker calls queue bounded argv, separate stdout/stderr, status/hashes and inspections in memory; they never write/fsync evidence. The live start boundary is also queued. Container stdout remains at most4MiB; the complete stdout queue is at most5MiB including reserved daemon evidence, stderr at most256KiB, queued JSON notes at most1MiB, at most32 calls/24 notes. Raw stderr/arbitrary exception messages never appear in the sanitized summary.

One absolute monotonic120second live budget covers start attachment, client kill/reap and actual exit inspection;1.25seconds is reserved for closure inspection/reap inside that budget. No input hashing, approval reread, evidence persistence or fsync occurs while that container may be applying SQL. Failure or deadline enters independent absolute TERM10second then KILL5second phases. Within each phase, signal CLI, client reap, bounded wait and exit inspection share the same deadline; timeouts are not summed. Wait exit and inspected exit must agree when both are available. No additional live daemon/reap allocation is added after those phases.

Only after actual stopped state is known are post-input proof, approval recheck, post-stop daemon-security check and queued evidence persistence allowed. Pre-create staging records are allowed. Persistence failure after stop fails the observation but cannot strand a live applying-SQL container. If closure cannot be established, the launcher reports an operational hold, retains the ID file and emits bounded actual call statuses/hashes in its sanitized result, does not write the raw in-memory queue under an uncertain live state, and never claims closure or launches a second attempt. Unpersisted raw queue contents are not durable after supervisor exit; the coordinator must retain the sanitized operational-hold result and resolve the retained container separately rather than treating missing disk evidence as closure.

The original fixed image/cache/UID, exactly two physical readonly/rprivate source binds, one256MiB `/work` tmpfs, readonly root, network-none/zero ports, clean five-key process environment, cap-drop ALL/default seccomp/no-new-privileges/init, resource/stop limits and retained-container/no-cleanup restrictions remain unchanged. No pull/build/install/retry/restart/network-connect or second create is introduced.

## Remaining gates

Freeze the separately mutating control and completed manifest/compiled closure; authenticate the original prerequisite copy and both new security streams/statuses; freeze the actual complete default mask policy; independently review **these actual amended launcher bytes plus producer/compile closure**, then authorize explicitly. No execution or validation occurred in this allocation. The migration experiment remains unexecuted/held, K acceptance withheld, and product admission withheld.
