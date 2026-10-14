# Type visibility source handoff

## Released change

Following independent PLANAPPROVE, the exact one-product-file lease was implemented in `tooling/typescript/base.json`: `compilerOptions.types` changed from `["node"]` to `["node", "bun", "css-modules"]`.

Every other configuration key and value remains unchanged, including ES2024 target, existing DOM/ES2024 libraries, strictness, `noUncheckedIndexedAccess`, `skipLibCheck`, paths and exclusions. No include changes or Node-24 runtime-target changes were made.

The added visibility reuses already declared and installed `@types/bun` / `bun-types` at `1.3.10` and `@types/css-modules` at `1.0.5`, as recorded in `convergence-type-visibility-plan.md`. No manifest, lockfile, declaration, runtime source, or asset was changed. No comments, ambient stubs, suppressions, dependencies or tests were added.

## Freeze and validation handoff

The sole product write is the types-array replacement above; the sole additional write is this new handoff report. The author releases both files frozen to the coordinator and will make no further changes without a new lease. Other source and artifacts were untouched.

No commands, hashes, checks, compilation, evaluation, tests, SQL, engine/container operations, private environment/data reads, network access, installations or nested agents were performed. Validation is pending: the coordinator owns fresh focused typechecks for core, UI, db, boards, custom-widgets, backend and Nitro, plus lint/format verification. No successful validation is claimed by this handoff.

The config change establishes new source/configuration provenance. Old compiled outputs, baseline receipts and input manifests remain historical and immutable; none is relabeled as current validation of the new config. Fresh coordinator receipts must identify the changed config. Separate remaining diagnostics stay with their existing owners; this lease does not authorize fixes or weakened compiler/environment definitions.
