# Bcrypt schema fit: finite source-only handoff

**Frozen source candidate for independent rereview; execution remains held.** The coordinator reports that Oracle `ses_ece27e275ffeFrDXWLQsyMp7K4` compared the entire actual559-line prestart policy record for CID-prefix9ace against every check and identified exactly three missing optional object fields, with no other literal/shape mismatch. This author did not repeat that comparison or run any checks.

`TEMP` is `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode`.

Only new outputs:

- `TEMP/nitro-bcrypt-schemafit-GW44Zcjb/records/launch-bcrypt.py`
- This handoff.

Baseline `TEMP/nitro-bcrypt-successor-VvBMknmF/records/launch-bcrypt.py` is untouched. The prior created, never-started container, its evidence and once-lock are preserved; this lane did not reset, start, stop, remove or otherwise operate it.

## Exact finite delta

The new stage literal is the only path change. Three local checks replace only their corresponding generic empty-option checks:

| Field                   | Accepted                        | Rejected                                                                   |
| ----------------------- | ------------------------------- | -------------------------------------------------------------------------- |
| `Config.ExposedPorts`   | Omitted, null, empty dictionary | Any list including `[]`, booleans, nonempty dictionaries, all other values |
| `HostConfig.Sysctls`    | Omitted, null, empty dictionary | Any list including `[]`, booleans, nonempty dictionaries, all other values |
| `HostConfig.StorageOpt` | Omitted, null, empty dictionary | Any list including `[]`, booleans, nonempty dictionaries, all other values |

There is no generic helper change or schema-wide relaxation. `absent_options` still requires keys. The mandatory container `Config.Volumes` check is unchanged; the existing local optional cached-image `Config.Volumes` check is unchanged. Strict security/OOM/resource/mount checks, actual two readonly binds, networknone, actual port-map and publishfalse checks remain unchanged. This is the complete approved finite prestart reconciliation, not another planned one-field trial.

The prior P1 repair remains: after a start attempt, `created` never proves stopped state. The create-attempt flag and bounded safe-precreate cause/call persistence remain unchanged; once create is attempted, ambiguous CID or unestablished closure/reaping retains operational HOLD without result writing. Killing a client never establishes daemon-operation cancellation.

## Preserved identity and release gate

The coordinator-copied6750-byte probe with SHA-prefix18f93 is untouched. `records/prior-source-pins.json` and `records/prior-recorded-policy-multiline.json` are untouched copied evidence, not new runtime proofs. Seven package/source pins and the native path/size/SHA constants still address the same immutable third artifact. No recompilation, package replacement, native rebuild or expected-byte derivation occurred.

Image digest/ID, Linux-arm64 Bun1.4.2, six clean environment keys, nonroot identity, caps/no-new-privileges, readonly mounts/root, memory/swap/PID/core limits, one16MiB work tmpfs, retained CID/once-lock,30-second watchdog, TERM10/KILL5, bounded streams/reaping, prestart-only immutable policy and post-stop null handling remain unchanged. No retry or auto-removal was added.

The coordinator must obtain independent rereview, then perform AST/exact-delta, private-mode, fresh launcher hash and all seven source/native ELF/pin rechecks before any separately authorized single fresh-stage attempt. This author did not execute those gates, calculate hashes or verify permissions. No attempt is permitted merely because the source was authored.

No commands, tests, checks, evaluation, addon/native loading, SQL, environment/data/secret reads, old-stage writes or nested agents were performed. No native compatibility, application, K/D/auth, adoption or production PASS is claimed. Existing holds remain unchanged; this lane's SQL remains zero.
