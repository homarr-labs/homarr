# Approved syntax-equivalent formatting source cut

## Outcome

Both approved syntax changes persisted through `tools.patch`; no retry was needed. This is a new syntax-equivalent source cut, not a replay of the earlier whitespace candidates. The prior blocked report and `nitro-convergence-format-source-e071975de798` evidence remain unchanged.

- `apps/backend/src/server/runtime-composition/authenticated-rpc.ts`: only the enrolled-read map callback changed from an implicit return to a block containing `return Object.freeze(... satisfies FetchContribution);`. The exact object, body, captures, arguments, evaluation order, and public properties are unchanged; no await or other control flow was added.
- `packages/db/test/schema.spec.ts`: only the private alias `PostgreisqlConfig` and its references became `PgConfig`, with accompanying printer wrapping. Type cells, guards, data, properties, schema/DDL, and strict assertions are unchanged.

Byte-only comparison confirmed each observed after snapshot matches its specifically approved syntax substitution when whitespace is excluded. This is source evidence, not compiler/runtime validation or macro approval.

## Source pins

| Source                                                             | Before SHA-256                                                     | After SHA-256                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `apps/backend/src/server/runtime-composition/authenticated-rpc.ts` | `418ce024d908b6e59499ec7eaec0e6e19af789c06e6ed6ba46c019d54e1ceea4` | `3f320b3680326d8717fb7a84ae772225cf28d6c56485fa9c88538d5e076abda0` |
| `packages/db/test/schema.spec.ts`                                  | `7ab2ed98826e7c223572edb3aba835fea5ce91c74c6a69c91a892d15fb8b3cca` | `eb7557d08b06e2eef49cc48d43477fb87642693193cc0962b074f180fe28e928` |

## New capture and freeze

Stage: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-convergence-format-syntax-source-a3080572ae93`

- `before/` and `after/`: fresh snapshots of exactly the two leased source files.
- `records/authenticated-rpc.ts.diff` and `records/schema.spec.ts.diff`: fresh before/after diffs.
- `records/before-pins.json` and `records/pins.json`: fresh source associations and approved-substitution comparison results.
- `records/freeze.json`: source/report/artifact hashes and final source-to-after-snapshot association.

Capture used Python `-I -S -B` standard-library file I/O, hashes, and diffs; stage directories are mode 0700 and evidence files were exclusively created at mode 0600.

## Limits and coordinator handoff

No formatter, compiler, lint/check command, code evaluation, tests, app import, SQL, Engine, network, private configuration/data inspection, nested agents, or native replay ran in this renewed lease. No helper, dependency, cast, any, comment, test, configuration, formatter disable, ignore, or exclusion was added. Only the two leased sources and this new report were written in the repository.

The coordinator must run fresh combined affected checks and associate them with these new after pins. Prior checks and reviews remain associated with their original source bytes; this report does not claim those old artifacts validate this cut.
