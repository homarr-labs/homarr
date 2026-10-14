# MAIN assembly callback syntax — source freeze

## Outcome

**The independently approved single-callback syntax cut is authored and frozen.** Actual after bytes differ from the accepted before image; the patch was not restored. This is source handoff, not SOURCE ACCEPT or a formatter/compiler/check PASS. Fresh affected-three/style checks belong to the coordinator after this freeze.

Only `apps/backend/src/server/runtime-composition/assembly.ts` changed, in the asset-fallback map at current lines 322–332. The existing typed `FetchContribution` arrow now has a block body explicitly returning the identical object. The six tuple paths and order, existing `as const`, object allocation, hostPath call, descendants/public access, async handle and `NOT_FOUND`/404 response are retained. No extra callback work, helper, comments, dependencies, tests, `any`, cast or suppression was added.

The retained diff contains exactly that one hunk. Capture-service forwarding, request services, root/policy ownership, other callbacks and publication/enrollment bodies are outside the delta. Source review of the diff found no object-value, string/type or evaluation-order change.

## Fresh evidence

Private stage:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-main-assembly-format-syntax-source-e23cb63e4b8ad47334c9143e`

Two bounded pure `python3 -I -S -B` captures created the stage 0700 and artifacts with O_EXCL/0600. They retained source bytes, SHA-256 pins and a difflib unified diff; the before pin matched the coordinator-specified accepted assembly source. No product write follows the after capture.

| Image       | SHA-256                                                            | Bytes / lines |
| ----------- | ------------------------------------------------------------------ | ------------- |
| `before.ts` | `1b135ca457c381572ca2660d84d19c5c49da891e14d8d2843598adcbc3625a44` | 15392 / 394   |
| `after.ts`  | `44f6b0a3d4aa8002284a6055c2895747169ef84f8ca35504dbf60ff5c30243f7` | 15440 / 396   |

Also retained: `before.json`, `after.json`, `source.diff`. Actual capture status is **`SOURCE_CHANGED`**, with `matchesBefore: false`. The complete diff was read as source evidence.

## Holds and scope

- The earlier format-only **BLOCKED** report, stage and canonical candidate remain unchanged historical evidence. This is a separately approved syntax cut, not a whitespace replay or formatter-configuration workaround.
- Previous Main5 security/lifecycle acceptance and affected-three receipts retain their prior source associations. They do not automatically accept this new assembly pin.
- No formatter, check, typecheck/lint/compiler, application evaluation/test, network/SQL/Engine, private configuration/data or nested-agent action ran. The only commands were the two authorized pure captures; the mandatory patch tool authored the source and this new report.
- No other product or scratch-control path was edited. Stable MAIN semantics remain available to the separate report-only wire planner; this cut supplies no mutable private-source access or scratch metadata execution.
- Transport/oRPC body, final BackendContext/input, CSRF/API/output/publication, completeSetup and enrollment holds remain unchanged. No new route, runtime/artifact proof or phase completion is claimed.

The frozen source, before/after images, full diff and pins are ready for the coordinator's independent successor review/check allocation.
