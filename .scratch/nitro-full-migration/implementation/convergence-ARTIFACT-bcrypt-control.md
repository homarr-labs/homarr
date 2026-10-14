# Bcrypt compatibility control: source-only handoff

## Gate

**Authored, not run; execution remains HOLD pending independent source review, complete package pins, and private-mode verification.** Oracle `ses_ece27e275ffeFrDXWLQsyMp7K4` approved the minimal plan, not the authored controls or execution. No commands, checks, tests, module evaluation, native loading, SQL, application boot, installation, Docker operation, environment/credential/data read, or nested agent were performed in this lane.

`TEMP` is `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode`.

Only new source outputs:

- `TEMP/nitro-bcrypt-probe-h6nXZrBr/control/probe.mjs`
- `TEMP/nitro-bcrypt-probe-h6nXZrBr/records/launch-bcrypt.py`
- This handoff.

The artifact remains untouched at `TEMP/nitro-artifact-third-NdG9siCj/build-work/artifact`. Original bcrypt6.0.0 and node-gyp-build4.8.4 manifests, entries, helper and loader were read as source. The recorded Linux-arm64 glibc addon is `server/node_modules/bcrypt/prebuilds/linux-arm64/bcrypt.glibc.node`: 76640 bytes, SHA-256 `68f3cf61756809c6d466c186aaa2bc1cbc17911f248c361a5284aa4e769fcc52`, ELF64 little-endian, machine183. These constants and the server entry pin come from `convergence-ARTIFACT-linux-closure.md`, not a new native execution.

## Required before execution

The named `packaging-static.json` was not found in the supplied stage or repository searches. Consequently the author did **not** invent package/source/loader hashes or calculate fresh authority. The launcher requires a reviewed finite JSON map through `--reviewed-artifact-pins`, with artifact-relative paths and exactly `{bytes, sha256}` for:

1. `server/index.mjs`
2. `server/node_modules/bcrypt/package.json`
3. `server/node_modules/bcrypt/bcrypt.js`
4. `server/node_modules/bcrypt/promises.js`
5. `server/node_modules/node-gyp-build/package.json`
6. `server/node_modules/node-gyp-build/index.js`
7. `server/node_modules/node-gyp-build/node-gyp-build.js`

The coordinator must recover the existing readonly packaging evidence, freeze its seven pins alongside the reviewed control hashes, and have that exact argument reviewed before any launch. Pins are passed as a fixed command argument, not environment variables, writable mounted authority, or runtime-derived expected values. The entry/native pins are additionally fixed in source. Missing authority is a blocker, not permission to bless observed bytes.

The patch authoring facility does not set file permissions. The coordinator must separately establish canonical UID501/GID20 directories at0700 and controls at0600, then perform the agreed source-only AST/hash/private verification. This author made no permission or verification claim. `home`, `home/docker` and `tmp` may be created only inside the new stage by the isolated launcher at0700; no source file is written elsewhere.

## Intended single attempt

The source requests the cached Linux-arm64 image digest `9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895`, image ID `a81de950abb8b5d961ed8c1dcd345450fab8cda00ea3c11e7ec24a4ed4bb82ce`. The clean process has exactly six fixed keys. An `env -i` entrypoint runs Bun1.4.2 with env-file loading disabled; the builtin control creates only private ephemeral work home/tmp directories.

The container is nonroot501:20, networknone, init, readonlyroot, capdropALL, no-new-privileges,128MiB memory/swap,64PIDs, core0, no restart/healthcheck/ports/pull/build. It has exactly two readonly binds (`/artifact`, `/control`) and one16MiB nosuid/nodev/noexec `/work` tmpfs. The lexical Docker invocation is retained as argv[0], with the canonical executable supplied separately to `Popen`.

The once-lock and retained CID precede start; exact immutable policy is checked only from the mandatory before inspection. False policy flags require actual booleans, including prestart `OomKillDisable:false`; no post-stop policy revalidation treats null as false or as a new failure. Acceptance separately requires same CID, actual stopped/exited state, exit0 and `OOMKilled:false`. The attached execution has a30-second watchdog, TERM/10-second and KILL/5-second fallback. Bounded streams remain queued in memory until stopped/reaped evidence allows writing the result. There is no auto-removal or retry.

The probe anchors `createRequire('/artifact/server/index.mjs')` without importing that entry. Its only explicit package requires are the actual bcrypt and node-gyp-build entries. It checks reviewed source identities before load, observes the selected native cache entry, verifies canonical artifact containment, actual filename, bytes/hash and ELF header, and rejects unexpected new cache entries. It does not fabricate a missing native-cache entry or substitute a guessed path. A differing observed contained native entry is reported and rejected before hashing synthetic input.

One fixed synthetic string is hashed at cost4; same-input comparison must be true and different-input comparison false. Only booleans and actual native path/bytes/SHA are emitted. No bcrypt output string or fixture is disclosed or persisted. Package pins are checked again after work. No fetch, application, DB, provider or credential imports exist in the control.

## Claim boundary

This is a source-only review candidate, **not yet freeze-ready for execution** because package pins and private modes need coordinator completion. Do not run it before the independent review accepts both controls and the fixed pin argument. A later successful single attempt would establish only this artifact's selected addon compatibility in this exact cached Bun container. Application boot, PACKCLI, Node24.18 parity, K/D gates, provenance, adoption and production remain held; SQL remains zero.

## P1 created-state repair: source-only rereview handoff

Reviewer `ses_ece27e275ffeFrDXWLQsyMp7K4` identified that a `created` inspection after a start attempt cannot establish closure: terminating the Docker client does not cancel a daemon-side create/start operation. The unexecuted launcher now passes its existing `started` flag explicitly through every stopped-state check and `stop_retained`. `created` is accepted only before any start attempt; once attempted, stopped evidence requires `exited` or `dead` with the existing actual non-running/PID0/unpaused/non-restarting checks. Mandatory prestart `created` policy inspection remains unchanged.

If cleanup never establishes that terminal state, bounded receipts remain queued in memory, the launcher reports `operational-hold-stop-or-reap-unestablished`, and no `result.json` is written. Client death alone is never stopped-container evidence. Watchdog30seconds, TERM10/KILL5, same-CID retention, stream bounds/reaping, prestart immutable policy, post-stop null handling, and hash proofs are unchanged.

Per coordinator handoff, the old reviewed launcher and source pins were archived under `records/before-created-state-fix`, no once-lock/create/start/result exists, and the exact seven package pins are now retained in `records/source-pins.json` from the closed third artifact and installed-source byte comparison. This supersedes the earlier missing-pin handoff blocker without claiming optional `packaging-static.json` evidence or independent verification by this author.

Only `records/launch-bcrypt.py` and this appended section changed in the repair. `control/probe.mjs`, artifact bytes, isolation limits and environment remain untouched. No commands, checks, tests, evaluation, addon loading, SQL, environment/data/secret reads or agents were run. The source candidate is ready to freeze for independent rereview and coordinator AST/new-launcher-hash release; **no attempt is permitted before that review**. All broader adoption/readiness holds remain unchanged.
