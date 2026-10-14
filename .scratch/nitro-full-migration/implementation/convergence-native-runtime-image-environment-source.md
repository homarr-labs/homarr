# Host image environment/confinement source handoff

**Authored only; STOP before CREATE/START/native initialization remains.** The coordinator granted the host-only source lease after both combined plan axes approved. The changed host is not yet newly frozen, independently source-accepted, or freshly checked. Previous four/six exit0 results are baseline evidence only.

## Scope and association

- Changed only `TEMP/nitro-native-runtime-driver-t_05t8qe/author/host-launch.mjs`; this new handoff is the sole repository write for the source lease. `TEMP` is `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode`.
- Baseline receipt: `TEMP/nitro-native-runtime-driver-t_05t8qe/records/environment-source-before.json`, recording 50,455 bytes and SHA256 `cf358060a87db6d3e9ab00550b9f7f5d2cd40f6f7ca44edc8376c6a3497a6e2d`, with retained `records/host-launch.environment-before-image`. These are read receipt values, not newly computed hashes or a verification of successor bytes. Neither record was changed.
- Inputs: amended `convergence-native-runtime-image-environment-plan.md`, accepted reported-commit facts in `convergence-native-runtime-engine-contracts.md`, and the public `supplement1-image.json`. The combined amendment supersedes the Engine report's earlier optional bare-removal proposal.
- Driver/compiler/caller/K/profile/product/assets/fifth artifact/checker and all old source images, receipts, projections and reports remain untouched. No new helper file, test, dependency, framework, comments, source-owner/gate/schema/backend/AuthKernel/publication change, or additional API operation was introduced.

## Fixed image and closed maps

`captureReceipt` retains existing image/provenance/executable guards and additionally requires these exact values:

| Binding                                                       | Required value                                                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Reference                                                     | `oven/bun:1.4.2`                                                                                |
| Platform                                                      | `linux/arm64`                                                                                   |
| ID                                                            | `sha256:a81de950abb8b5d961ed8c1dcd345450fab8cda00ea3c11e7ec24a4ed4bb82ce`                       |
| RepoDigest                                                    | `oven/bun@sha256:9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895`              |
| `image.environmentDefaults.PATH`                              | `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/bun-node-fallback-bin` |
| `image.environmentDefaults.BUN_INSTALL_BIN`                   | `/usr/local/bin`                                                                                |
| `image.environmentDefaults.BUN_RUNTIME_TRANSPILER_CACHE_PATH` | `0`                                                                                             |

The coordinator field must have exactly three own keys with those exact values. Missing/mismatched fields reject; no source-created verification flag or callback substitutes for evidence. After validation, the captured receipt retains the frozen host-owned exact map.

The fresh image predicate checks actual ID, linux/arm64 and actual RepoDigest membership against the receipt and fixed constants, then validates actual `image.Config.Env` against the frozen three-entry map. The source-local `requireEnvironment` requires exact array length, string entries, a first `=` separator after a nonempty name, closed own-name membership, exact value equality, and no duplicate names. Comparison is order-independent; duplicate equal values, extra/missing names, bare deletion markers, malformed/changed PATH and changed values reject. No prefix filtering, generic Bun-name policy, coercion, or inspected-value authority exists.

## One retained expected context environment

The original child input fields and original admitted wall/deadline/work-budget values remain unchanged. Immediately before the original CREATE dispatch, `JSON.stringify(childInput)` is evaluated once into `serializedChildInput`; one frozen `expectedEnvironment` map is captured from that string and declared constants:

| Name                                | Required value                                          |
| ----------------------------------- | ------------------------------------------------------- |
| `HOME`                              | `/home/proof`                                           |
| `TMPDIR`                            | `/tmp`                                                  |
| `PATH`                              | `/usr/local/bin:/usr/bin:/bin`                          |
| `NITRO_NATIVE_PROOF_INPUT`          | The same original `serializedChildInput` used by CREATE |
| `BUN_INSTALL_BIN`                   | `/usr/local/bin`                                        |
| `BUN_RUNTIME_TRANSPILER_CACHE_PATH` | `0`                                                     |

CREATE preserves the first four declarations and adds the two literal verified Bun values. No ambient configuration/environment or application/secret/PG/docs/preload defaults are read. The image fallback directory is not added to requested PATH or executable allowlists. The Bun defaults declare a bin location without installer execution and literal disabled transpiler cache; no executed Bun-cache behavior is claimed.

`requireContext` closes over the genuinely retained map, first rejecting an absent/nonfrozen/non-six-key map, then requiring actual `context.Config.Env` to match it exactly. It never reconstructs expectations from inspect or refreshes child input/deadlines. All existing joins use this same predicate: pre-START, termination reconciliation before any owned kill, reconciliation post-wait, and `verifyStop` after control settlement. A CREATE dispatch necessarily follows capture. Admission failure before dispatch follows the unchanged not-dispatched reconciliation return, without fabricating a map or validating an unowned context.

Six-entry Config.Env is configuration evidence only. The accepted matching Engine contract generates HOSTNAME outside Config.Env; Tty=false does not generate default TERM. No whole-process environment measurement is asserted. Image User/Healthcheck/Volumes and runtimeArgs remain recorded absent, not reinterpreted as empty.

## Confinement and request guards

- The same `requireContext` at every join requires each of the two existing inspected mounts to be `Type === "bind"`, retaining exact source/destination/RW checks. Mount count remains two, not four.
- `HostConfig.Tmpfs` must have exactly two own keys `/tmp` and `/home/proof`, both `rw,nosuid,nodev,noexec`; missing, changed or extra keys reject.
- CREATE explicitly sets `Init: false` and `CapAdd: []`. Inspection requires actual Init=false; CapAdd admits only absent, null, or an empty array. Present undefined, malformed, or nonempty additions reject. Existing CapDrop=ALL and Privileged=false remain required.
- Platform moved to `platform=linux%2Farm64` in the same sole CREATE query; the ignored Platform body field was removed. Receipt `engine.apiPrefix` now requires `/v1.56`, retaining prior syntax/local endpoint/runtime guards. No version GET or arbitrary-daemon compatibility claim was added.
- Exact empty Cmd, owned two-element Bun/driver Entrypoint, runtime runc, private PidMode, IPC none, current security colon spelling, resource comparisons and every other original physical Config/HostConfig/state guard remain unchanged.

## Preserved bodies and remaining holds

The patch does not change original signal handling, wall/monotonic budget calculations, admission bodies, kill intent/slot, original CREATE/START task settlement and ambiguity, wait/stop state bodies, control/transport/file drains, evidence writes, or provisional/final returned-result bodies. Only the shared context predicate strengthens their existing validation joins; no new timer, owner, runner, retry, second context, source execution or workaround was introduced. Bounded formatter-only movement is not acceptance evidence; independent review must compare against the retained before image.

No commands, lint/syntax/typecheck, tests, hashes, compilation/evaluation, Node/Python invocation, Engine/container/network action, private environment/config/data/secret access, SQL/native operation or nested agent ran in this author lane. Fresh focused checks and both independent source axes remain required after freezing the changed host; new source/tool pins, review indexes and receipt/template bindings must be genuinely measured later. The fixed caller already copies `nativeRelease` unchanged, so the future approved image field requires no caller-source edit.

All exported allocation authorities remain false and proposed policy remains UNKNOWN_UNAPPROVED with unassigned amounts. Remaining prerequisites include guest input/output access and physical immutability/closure, exclusive writers, active independent runner/outer failure ownership, separately approved finite work/force/total/resource amounts and enforcement limitations, matching endpoint/API/runtime/platform-contract binding, actual fresh image/new-target pre-START and post-stop observations, and distinct initialization/launch authority. No runtime, namespace, executable, resource-enforcement, current-source acceptance or closure proof follows from this handoff. Any separately released native attempt remains one new EMPTY `:memory:` consumer only, without file database/core-auth/application boot permission.
