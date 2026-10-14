# Bcrypt successor: source-only freeze handoff

**Ready for independent source rereview; not authorized to execute.** Oracle `ses_ece27e275ffeFrDXWLQsyMp7K4` approved the minimal future plan, not a runtime result. This author created only the new launcher and this handoff; no commands, checks, tests, evaluation, addon loading, SQL, environment/data/secret reads or nested agents were performed.

`TEMP` is `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode`.

New launcher: `TEMP/nitro-bcrypt-successor-VvBMknmF/records/launch-bcrypt.py`. Baseline: `TEMP/nitro-bcrypt-probe-h6nXZrBr/records/launch-bcrypt.py`, preserved without changes. Its failed stage, once-lock, host exit1 and retained evidence remain historical evidence, not an attempt to overwrite or retry in that stage.

## Exactly three changes from the baseline

1. The stage literal names the fresh successor. The coordinator-copied `control/probe.mjs` is untouched; per handoff it is the original6750-byte, SHA-prefix18f93 control. Copied seven-pin/reference/discovery records are untouched.
2. Only the cached-image `Config.Volumes` check accepts omission, null or an empty dictionary. Nonempty dictionaries, lists (including empty lists), and every other value are rejected. Generic `absent_options` still requires actual keys; container volume/security checks are unchanged. This is not general permission to treat absent policy as successful.
3. `create_attempted` starts false before the try and becomes true immediately before the sole Docker create call. A failure before any create attempt, with no CID and all actual client return codes reaped, may persist its bounded queued original cause and call receipts. That receipt records `success:false`, `createAttempted:false` and `stoppedEstablished:false`; writing precreate evidence is not a stopped-container claim. Any ambiguous create attempt retains the prior operational HOLD/no-result-write rule until actual same-CID closure and reaping are established. After start is attempted, `created` still cannot establish stopped state.

No new protocol, framework, dependency or comment was added. The result adds only the create-attempt flag and explicit stopped status; its write predicate distinguishes safe precreate-failure persistence from actual container closure. Client termination never establishes cancellation of daemon create/start.

## Preserved safety and authority

The exact third immutable artifact, seven reviewed source pins, fixed entry/native constants, cached Bun1.4.2 Linux-arm64 digest/image ID, six clean environment keys, nonroot501:20, isolation/capabilities/resource limits, two readonly binds and single16MiB work tmpfs are unchanged. So are source-pin checks, prestart-only immutable-policy verification, post-stop null handling, retained CID/once-lock, bounded queued streams/reaping,30-second watchdog, TERM10/KILL5, and no pull/build/install/retry/auto-removal.

The coordinator reports that the old failure was `prestart-empty-Volumes` before create, with no old CID file, zero discovered container IDs and no Bun/native launch. This author preserves that account as coordinator evidence; no discovery or runtime verification was repeated here. Optional `packaging-static.json` is not claimed as authority.

## Release gate and roles

The source is frozen for Oracle rereview, followed by coordinator AST, exact baseline-delta/pins/modes verification and a fresh launcher hash. The author has not calculated or blessed a new hash or private mode. Only a later explicit authorization may permit one successor host attempt; none is permitted during authoring or before review acceptance.

The coordinator owns runtime authorization and evidence custody. Separate product-startup and metadata-diagnosis owners retain their existing work; this author changes neither lane. No native compatibility, application readiness, K/D/auth acceptance, adoption or production PASS is claimed. Existing holds remain, and this lane's SQL remains zero.
