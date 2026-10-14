# Guest-policy source handoff — static author only

**Three-site successor authored; STOP before materialization/CREATE/START/native initialization remains.** Conditional plan approval and the coordinator's narrow author lease permit this source cut only. The changed host needs coordinator freezing, independent review and fresh focused checks before successor-source acceptance; baseline acceptance does not transfer.

## Association and exact delta

`TEMP` = `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode`.

- Sole executable source changed: `TEMP/nitro-native-runtime-driver-t_05t8qe/author/host-launch.mjs`.
- Read baseline receipt `records/guest-source-before.json`: 53,586 bytes, SHA256 `aac8b7f08efb95fa5585560c52d63ef3f826bbd913f7c822f4745cf1d56035c3`, preserved before image `records/host-launch.guest-before-image`. These are retained receipt values, not newly computed successor measurements. Both remain untouched.
- Read `convergence-native-runtime-guest-policy-plan.md` and current `ROSTER.md:7–9` author allocation. The coordinator's explicit clarification permits static authoring while deployment ownership mapping remains a materialization/CREATE/launch hold; this source does not establish that mapping.

| Existing site                             | Before                                          | After                                   |
| ----------------------------------------- | ----------------------------------------------- | --------------------------------------- |
| `captureReceipt`, baseline line285        | `value.policy.sandboxRootUserApproved === true` | `value.policy.sandboxUser === "501:20"` |
| Shared `requireContext`, baseline line808 | `context.Config.User === "0:0"`                 | `context.Config.User === "501:20"`      |
| Sole CREATE, baseline line1267            | `User: "0:0"`                                   | `User: "501:20"`                        |

The patch replaces only those three expressions. The obsolete root-approval assertion is retired, not retained true for a nonroot request. Numeric identity is fixed, not a generic caller-selected User or a new approval boolean. The existing genuinely APPROVED policy and all other receipt guards remain required. The carried `nativeRelease.policy` can hold this exact value in a separately approved future template without any caller-schema/source edit; no receipt, callback, index or pin was created here.

All existing pre-START, termination, post-wait and cleanup inspections already join the same `requireContext`; strengthening that exact User equality therefore applies at every existing join without callsite/control-flow changes. Existing closed three/six-entry environment maps, original retained child-input serialization, fixed image identity, API/platform binding, Init/CapAdd/Tmpfs/mount restrictions and physical state guards are unchanged. Original clocks/budgets, admission, tasks, kill intent/slot/reconciliation, HTTP/wait/stop, writer drains and evidence/result finalization bodies are unchanged. No additional UID/GID, mode, timer, helper, reaper, API or policy-amount field was introduced.

## Scope and remaining holds

- Only the host and this new report were patched. Caller, driver, profile, K, product, compiled child, assets, receipts and before image were not changed. No chmod/chown or actual materialization occurred; no tests, comments, dependencies, framework or helper file was added. The requested patch is three expression substitutions; no formatter was invoked. This is not a measured one-token/diff certificate: independent review must compare actual successor bytes with the preserved before image and account for any tool-side formatter movement.
- Future copied input directories0500/files0400 and output0700/result0600, host501:20, remain prospective fresh-allocation policy only. Exact deployment numeric-owner/idmap preservation, guest read/write access and pinned Bun/runtime access remain unproved by this source; no permission widening, existing-file repair or probe is authorized.
- Actual runner qualification and35s boundary/grace, original budgets, force/reap reservation `delta+r`, exclusive writers, capacity/resource enforcement, independent owner and failure/quarantine policy remain held. Candidate host20/22/30s amounts are neither approved nor implemented; no budget/deadline refresh or guaranteed force-room claim follows.
- All exported source allocation authorities remain false, and proposed policy amounts remain unassigned. No control/caller-worker/guest/materialization/initialization/application/data execution was performed or authorized. No commands, hashes, checks, evaluation, compilation, source invocation, native SQL, Engine/container/network action, private configuration/environment/data/secret access or nested agent ran.

**Next coordinator work:** freeze and genuinely measure the changed host, review the actual bounded diff independently, run the newly required focused checks, and bind future approved source pins/template policy without inventing authority. No source acceptance, sharing fact, runner approval, materialization permission or native-launch approval is supplied by this handoff.
