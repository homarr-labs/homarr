# E2 — formatter-stable callback source freeze

**The approved runtime-only amendment is retained and frozen for coordinator checks/rereview. Not self-SOURCE ACCEPT, project format/type/lint PASS or activation.** The independently approved format amendment controls this cut; the prior partial freeze and failed whitespace candidate remain historical and unchanged.

## Exact retained cut / equivalence

Only `apps/backend/src/server/runtime-composition/runtime.ts:129–137` changed: the existing `(path): FetchContribution` map callback now uses an explicit block and `return Object.freeze` of the SAME exact route object. Phase, path, descendants, public access object, controller.handle reference, Auth9 path list/order and outer array freeze are unchanged.

The post-patch capture verifies the entire file equals its before image with exactly that callback replacement; all surrounding bytes are identical. Each map invocation still returns one frozen route object and creates/freezes the same access object, with unchanged evaluation order/counts and controller identity. This is source equivalence, not executed runtime evidence. No function, guard, task, resource, signature, clock, construction/cleanup or authority addition.

One patch retained the approved cut. One installed `oxfmt` 0.58.0 preview through `bun --no-env-file` ran only on a NEW private copy with cleared environment except PATH and isolated HOME/TMPDIR, using a private copy of existing formatter configuration. The preview produced **no differences** from the retained patched bytes. No formatter wrote project sources; no old whitespace candidate was replayed, formatter configuration changed or patch bypass used.

## Immutable generation

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-wire-enrollment-format-source-735d767f9ad087f1c7c76ac9`

Directory/subdirectories created 0700; capture images/manifests/diffs/proof/candidate files created O_EXCL/0600. `before.json`, `after.json`, `0-before`, `0-after`, `0.diff`, `runtime-post-patch`, `runtime-post-patch.diff`, `runtime-formatter-candidate`, empty `runtime-formatter-preview.diff` and `runtime-callback-equivalence.json` preserve the exact retained source and private-preview comparison. Bounded isolated Python `-I -S -B` captures performed only permitted file/hash/diff I/O.

| Runtime generation            | SHA-256                                                            | Bytes / lines |
| ----------------------------- | ------------------------------------------------------------------ | ------------- |
| Before, partial E `00d269e4…` | `ef2e21f824eed2a6bc26c6ea7a7b9a338c4725b062621d0a83ba756c53956256` | 11388 / 274   |
| Frozen retained after         | `cd6dcb5ae3309f29e4e929fbe9ffa94a21c9c0361a4f3b79a3e346724704182e` | 11398 / 274   |

All **62 protected joins** remain byte-identical with empty diffs: assembly, all 59 previous protected joins, the partial repair handoff and controlling format amendment. Assembly stays `f0d2f73f534730620acc359ebd8d3358d0b60f78b4a66c31a2149389ee338b3a` (19491 bytes / 488 lines), retaining its sole approved onboarding access-freeze predicate removal.

Protected D pins remain Application `6e065986421ef4242490b309db26125849d595c222802ec75adf5782a89e4391`, native owner `40282cdfef75484684b6374559110fdd350b8cb01ca142223a822e8ae5ecd4f7`, backend contracts `7c300226ee9a6b64eda20645f20926b9d7d6f7026a81a069b1a554369beb7f38`, neutral contribution `1915b46b18f9ebd11840fe899a9df1add83b5acf7150a3ef26da69a7958dc4ce`. C/Auth/API/DB, entry/host/ingress/request contracts/manifests and historical reports remain conserved by full indexed pins. Original E freezes, `rxdrtc2i`, failed formatter receipts and candidate evidence were not edited.

## Gates and holds

Coordinator owns fresh Backend/Nitro types, E2 lint/format and independent exact-source rereview against the retained runtime and protected repaired assembly pins. The private-copy formatter comparison is not a project check or source acceptance. No product patch follows this after freeze.

Only the released runtime source, this NEW handoff and fresh private captures were written. No compiler/lint/project format check/checksuite/test/evaluation/runtime import, SQL/native/Engine, network/private configuration/data, nested agent, commit or push. No comments/tests/casts/any/suppressions/helpers/dependencies/global configuration/unrelated formatting or cleanup changes.

F's preparatory plan does not release its writer before the E gate. Source enrollment remains distinct from application boot, default Next changes, transport/socket/client-receipt proof, runtime/native/FS/data/restore/cutover permission and completeSetup. Those holds remain; Fetch EOF is not socket proof. Auth9/two anonymous/twelve authenticated reads/three fixed writers, original budgets/policy and count 91 remain unchanged.
