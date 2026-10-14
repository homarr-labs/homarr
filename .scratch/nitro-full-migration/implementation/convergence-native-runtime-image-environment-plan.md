# Host image-ENV repair plan — review only

**STOP before CREATE remains. No source lease or launch approval is granted.** The supplied baseline is frozen repair1 `TEMP/nitro-native-runtime-driver-t_05t8qe/author/host-launch.mjs`, source accepted with six static checks exit0. Those checks were not rerun here. This plan proposes only a future independently reviewed repair to that host file; it does not modify it, the active caller author's two files, or the separate compiler-only executor.

## Evidence and measured binding

Here `TEMP` means `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode`. Read-only evidence is `TEMP/nitro-native-runtime-context-metadata-jie9h38t/records/supplement1-index.json`, its public `supplement1-bindings.json`, `supplement1-image.json`, `supplement1-runtimes.json`, and the supplement at `convergence-native-runtime-context-metadata.md:63–80` in this directory. Original projections and receipts remain unchanged; the supplement is not replacement evidence or a runtime proof.

| Binding                                   | Exact measured value                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Official tag                              | `oven/bun:1.4.2`                                                                                |
| Image ID                                  | `sha256:a81de950abb8b5d961ed8c1dcd345450fab8cda00ea3c11e7ec24a4ed4bb82ce`                       |
| RepoDigest                                | `oven/bun@sha256:9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895`              |
| Platform                                  | `linux/arm64`, as recorded in the public metadata report                                        |
| Image `PATH`                              | `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/bun-node-fallback-bin` |
| Image `BUN_INSTALL_BIN`                   | `/usr/local/bin`                                                                                |
| Image `BUN_RUNTIME_TRANSPILER_CACHE_PATH` | `0`                                                                                             |

The image environment is exactly these three names and values. For this narrow proposed policy, the two Bun defaults are known-safe: an install-bin location only, with no installer execution, and literal `0` disabling the runtime transpiler cache. This is not a generic Bun-variable whitelist, a measured execution result, or permission to inherit host configuration. The supplement itself measured values, not runtime semantics.

Image Config `User`, `Healthcheck`, and `Volumes`, and both recorded runtime mappings' `runtimeArgs`, are **absent**, not empty/null/disabled. Do not rewrite their projection or use omission as namespace/runtime evidence. Image Cmd and Entrypoint remain their recorded defaults; any Engine normalization holds are separate.

## Targeted future before/after

All line associations below refer to the frozen host, not the active caller's source.

| Host member/site                                     | Before                                                                                              | Proposed host-only repair                                                                                                                                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `captureReceipt`, 214–226; returned `image`, 315     | ID/digest shape checks and existing provenance/executable guards; no environment binding            | Retain every existing guard; additionally require the exact ID/digest above and the closed public map described below. Preserve measured Bun executable identity guards.                                     |
| Fresh cached-image validation, 1160–1170             | Every image Env string must start `PATH=`; the two actual Bun entries concretely fail before CREATE | Compare the fresh actual image identity and actual `Config.Env` against the exact pinned identity and three-entry map, independently of the coordinator receipt. No filtering or synthesized image response. |
| CREATE `Env`, 1204–1209                              | Four explicitly constructed entries: HOME, TMPDIR, restricted PATH, serialized driver input         | Keep those entries byte-for-byte in meaning; add the two exact verified Bun values explicitly. Six requested entries, no dynamic inheritance.                                                                |
| `requireContext`, 760–809; pre-START call, 1241–1243 | Physical Config/HostConfig/mount checks, but **no Config.Env check**                                | Retain all existing checks; additionally compare actual newly inspected `context.Config.Env` against the exact six-entry expected map before START. Do not widen Cmd, mounts, or other physical predicates.  |

Prospective protocol field: **`image.environmentDefaults`**, a coordinator-supplied plain name/value object containing exactly `PATH`, `BUN_INSTALL_BIN`, and `BUN_RUNTIME_TRANSPILER_CACHE_PATH` with the measured values above. Validate it against host-owned fixed expectations, alongside existing `image.id`, `image.repoDigest`, `image.reference`, and `image.platform`; then compare those expectations with the actual fresh image response. It is binding data, not a source-created `pinned`/`verified` boolean or a fabricated callback result. Reject a missing or mismatched binding. The fixed caller consuming the template must accommodate this reviewed field in its future release receipt; no caller source/template edit is authorized here, and receipt absence must remain a hold.

For both actual Env arrays, require an array of strings, exact entry count, a name/value separator, unique names, the exact closed name set, and exact string values. Parse at the first `=` so the existing serialized driver JSON remains intact. Reject duplicates even when values agree; reject missing/extra names, malformed entries/PATH, changed values, or changed identity. Compare canonical maps order-independently, never by array order, prefix acceptance, subset inclusion, or duplicate-overwriting conversion. Receipt map validation likewise requires exactly three own keys and exact string values. Do not coerce missing/unknown values to empty strings.

## Requested versus effective environment

Docker image-default merging means a four-entry request does not establish a four-entry effective Config.Env: the two image-only Bun defaults contribute to the new context. This plan chooses explicit equal-value Bun entries in the request so the complete expected set is declared; it still requires the separate Engine researcher's matching-version merge/normalization findings before implementation can be released. No Engine/API/kernel documentation research or experimentation is repeated here.

| New context name                    | Required value/source                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `HOME`                              | `/home/proof`, existing host declaration, not image/host HOME                                                                         |
| `TMPDIR`                            | `/tmp`, existing host declaration                                                                                                     |
| `PATH`                              | `/usr/local/bin:/usr/bin:/bin`, existing restricted host request                                                                      |
| `NITRO_NATIVE_PROOF_INPUT`          | Exact existing `JSON.stringify(childInput)` value constructed for this attempt, including its existing work/deadline/migration fields |
| `BUN_INSTALL_BIN`                   | `/usr/local/bin`, explicitly equal to verified image default                                                                          |
| `BUN_RUNTIME_TRANSPILER_CACHE_PATH` | `0`, explicitly equal to verified image default                                                                                       |

Build the expected six-entry map from these declared values and the same existing serialized child input, never from the inspected context's contents. The inspected PATH must be the restricted request, **not** the image PATH. Recognizing the image's fallback-directory value must not add `/usr/local/bun-node-fallback-bin` to coordinator executable allowlists, command lookup, or requested PATH. Entrypoint stays exactly `[receipt.image.bunExecutable, "/proof/input/closure/driver.mjs"]`; no optional Node installation, `require.resolve`, or runtime execution to qualify fallback support.

## Preserved scope and stop conditions

- Preserve source-accepted work/force/total bounds, admission, kill slot, namespace and exclusive-writer guards, original CREATE/START settlement, close/evidence behavior, and physical state/body checks. Do not redo the owner/drain/body design or weaken failure ownership when an Env check rejects.
- No changes to K, driver, profile, product/source assets, fifth artifact, or checker. No helpers, tests, framework, comments, dependencies, banners, preload, PostgreSQL/native-force substitution, environment stubs, default app data/secrets, or API-gate widening.
- Stop before CREATE if the reviewed receipt/source bindings, exact fresh image identity/map, or separate merge/normalization prerequisite is unavailable or mismatched. Cached defaults do not prove namespace, runtime, executable bytes, or authority. Unknown Cmd/Mounts normalization issues remain separate holds; do not fold speculative fixes into ENV scope.
- Stop before START if actual fresh context identity or six-entry Config.Env fails; preserve the accepted bounded settlement/cleanup/evidence path without retries or another context. An ENV repair cannot clear other context, failure-policy, runtime, or authority holds.
- Native scope, if separately authorized later, remains one new EMPTY `:memory:` consumer only: no fresh database file, core auth, SQL now, or application boot. This plan assigns no policy amounts or authority.

## Future review evidence, not work performed now

After a separate host-only source lease, associate the narrow diff with the four frozen sites above and rerun only the already-required focused static checks against the repaired host and current fixed caller association. Record fresh results and source pins; prior repair1 exit0 results are not successor evidence. Verify statically the exact three/six closed sets, duplicate/length rejection, fixed identity/value binding, preserved restricted PATH/two-element Entrypoint, actual fresh-image/pre-START inspection association, and unchanged accepted bounds/ownership bodies. No new test/helper/checker artifact is proposed.

Future coordinator review must update the release receipt's host source association and `image.environmentDefaults` binding, and append a separately identified repair/check result to the report without overwriting original metadata or supplement receipts. Distinguish static acceptance from any separately authorized fresh inspection; do not report a future comparison as already measured. Completion of these prerequisites is eligibility for independent review only, not unconditional closure, CREATE/START permission, or native launch approval.

## Coordinator combined host-only amendment

The reported-commit Engine/kernel standard contract was independently accepted by ses_ecce771e7ffenxftGQscWM9rSO. The measured image supplement supersedes the research report's earlier unknown-value and optional bare-removal proposals. Select the exact verified Bun defaults above, not deletion markers. Six-entry Config.Env is configuration evidence, not a complete measured process environment: matching Engine source adds HOSTNAME; Tty=false does not add default TERM. No full process-ENV measurement or Bun cache execution claim is made.

The prospective source lease remains exactly the existing host-launch.mjs. In addition to the three/six closed ENV maps and fixed measured identity, incorporate these independently grounded confinement corrections in the same bounded cut:

- Require each of the two existing inspected mount records to have Type=bind, preserving their exact source/destination/RW checks. Require HostConfig.Tmpfs to have exactly /tmp and /home/proof, each rw,nosuid,nodev,noexec, with no additional keys. Use the same predicate before START and after stop; legacy Tmpfs does not increase the inspect Mounts count to four.
- Explicitly submit HostConfig.Init=false and require actual false in both inspections. Explicitly submit CapAdd=[] and reject any nonempty added capabilities; absent/null/empty-array inspect representation is the supported no-addition case alongside existing CapDrop=[ALL] and Privileged=false. Do not infer disabled init or empty capabilities from an unknown value.
- Move platform=linux%2Farm64 into the existing sole CREATE query and remove the ignored Platform body field. Preserve exact Cmd=[], two-element owned Entrypoint, runtime runc, private PidMode, IPC none, current exact security spelling, resource bounds and all unchanged context checks.
- Capture the expected six-entry environment from the same original serialized child input before CREATE. All pre/post and cleanup context validation must use that retained expected map; never rebuild it from inspected values or refresh original child deadlines. An owned CREATE necessarily follows capture; admission failure must not fabricate a missing expected map.

No change to original admission/task/kill/reconciliation/wait/stop/I/O/clock bodies, driver/K/profile/product, caller sources, immutable compiler outputs or metadata receipts is allocated. Actual new-context observations, CREATE warnings, resource enforcement limitations, guest read/write access, exclusive writers, namespace contract, independent runner boundary, original policy amounts and separate initialization authority remain holds. The newly frozen caller serializes nativeRelease intact, so future image.environmentDefaults can be bound without a caller source extension; exact new host source/tool pins still require future measured approval.

This amendment is a plan, not a host writer release. Two independent plan axes must approve the exact map/identity and confinement/retained-bound joins before separate host-only authoring. Preserve old source images and checks; new focused lint/syntax/native typecheck and two source axes follow any approved cut. No CREATE, START, worker/caller invocation, native migration or database/application/data permission follows.
