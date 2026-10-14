# K core-limit padding fix

Source-only handoff; no compilation, checks, tests, host run, application boot, or native SQL performed.

## Frozen minimal deltas

- `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-schema-corefix-X7Z6sEeo/control/schema-control.ts`: successor control cloned with only `bytes$/m` changed to `bytes[ \t]*$/m` in the `CORE_LIMIT` regex. Both captured limits must still equal `"0"`. Only trailing horizontal padding is accepted; core policy is unchanged.
- `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-schema-corefix-X7Z6sEeo/records/launch-schema.py`: successor argv0-safe launcher cloned with only the fixed `STAGE` literal changed to the fresh corefix root and the fixed `ORIGINAL_COMPILE_CONTROL` literal changed to that root's `/control`, the coordinator's actual new compilation origin. No generic path, fallback, new mode, or other logic introduced.
- `.scratch/nitro-full-migration/implementation/convergence-K-core-limit-fix.md`: this source-only handoff record.

The 103 asset pins, exact 51-row ledger, native and metadata behavior, strict close, environment, capabilities, seccomp, LSM, init, masks, watchdog, bounds, and prohibition on live evidence persistence remain unchanged. No old stage, once-lock, evidence, or source/output provenance was edited.

## Supplied evidence and pending gates

Coordinator-reported previous container `8908...` was stopped/exited with exit 1 and OOM false; its actual receipt recorded native opened false, migration attempts 0, and preflight `CORE_LIMIT`. The coordinator's builtin probe exited 0 and confirmed zero core limits with five trailing spaces: original regex false, padded regex true. These are supplied observations, not checks performed in this handoff.

Independent semantics review, coordinator compilation at the new control origin, 111-input compile closure review, launcher review, frozen-input verification, and authenticated launch approval remain required before one fresh host run. No automatic run or migration retry is authorized by this handoff. K target, edit release, and D holds remain unchanged.
