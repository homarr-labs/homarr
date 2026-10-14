# BUILD — frozen source-only correction

## Exact change

Applied the single-line correction approved in `.scratch/nitro-full-migration/implementation/convergence-BUILD-plan.md` at `apps/nitro/vite.config.ts:126`: removed only the bare `"@homarr/backend/host"` SSR external. Retained `/\/backend\/src\/server\//` and `makeAbsoluteExternalsRelative: false` unchanged.

The approved source rationale is that SSR first resolves the existing declared package export, then externalizes its resolved backend source path. Final Nitro compilation is intended to bundle that same host path across SSR, entry and lifecycle consumers. This intended shared identity is not observed artifact proof; one physical host owner and one configuration owner remain unproven.

No alias, singleton, plugin, symlink, final external, dependency, other configuration, output path or gate was changed. Only the allocated Vite line and this new report were written.

## Preserved failure and remaining holds

The plan records the first build's numeric exit as **1** at `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-artifact-attempt-SkDTX9wH`. That failed attempt and its partial outputs were not accessed, repaired in place, rebuilt, overwritten or promoted.

K4 remains active elsewhere. Coordinator freeze and D/K acceptance of the current asset set remain required; existing activation, runtime and containment holds are unchanged. A separately authorized fresh isolated build, completed packaging and final graph inspection remain pending. Neither a successful new build nor a single physical host/configuration owner is established by this correction.

No commands, lint/typechecks, tests, builds, evaluation, runtime/native/SQL execution, data/environment/secret access or nested agents occurred. This handoff is frozen and source-only, with no compiler, runtime or procedure acceptance claimed.
