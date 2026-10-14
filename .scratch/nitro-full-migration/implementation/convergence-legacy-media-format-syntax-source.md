# Legacy Spotlight equivalent map syntax — source frozen

**The exact two approved syntax changes were retained after one product patch.** Source review and fresh focused type/lint/format validation remain required; no format0, compiler/runtime or application result is claimed.

Sole product file: `packages/spotlight/src/modes/external/search-engines-search-group.tsx`.

Report absolute path: `/Users/ajnart/.local/share/opencode/worktree/2c02d700e9bb9919ae05fff4b6cf05db10ebd1a9/rework-hono/.scratch/nitro-full-migration/implementation/convergence-legacy-media-format-syntax-source.md`.

## Exact source delta

1. `engineData.map` retains `(engine): ExternalOption` and now uses a block returning the same `{key, kind, engine}` object.
2. The existing `ddgData.filter` is unchanged. Its subsequent `.map` retains `(bang): ExternalOption` and now uses a block returning the same `{key, kind, bang}` object.

Both returned object allocations, property evaluation order, expressions, literal strings and callback/call counts are preserved. Only implicit object returns became explicit `return` statements; no await, throw, new policy or helper was introduced. This is the renewed syntax-equivalent cut, not a repeat of the blocked whitespace patch.

Full-file byte comparison against exactly these two literal replacements matched the actual after-image. Thus all surrounding source bytes—including the two accepted media read repairs, owner/session/intent/dispatch/render gates, labels, hook/API arguments, imports and existing type annotations—are unchanged. No alias, comment, test, cast, `any`, suppression, dependency, export, DTO/Auth/native or formatter-configuration change occurred.

## New immutable evidence

Allocation: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-legacy-media-format-syntax-source-v7w9uq74`.

| Image                |  Bytes | SHA-256                                                            |
| -------------------- | -----: | ------------------------------------------------------------------ |
| Authenticated before | 27,169 | `6dc7af33e30b506b9013b9561774a31ea09c1751e7cc959380bf12c800951c97` |
| Actual frozen after  | 27,237 | `6b0437004cc7d52b6277dfff5b16812181259183550eb9748a459c39ce149f23` |

The allocation contains `before.tsx`, `source-before.json`, `after.tsx`, `source-after.json`, `changes.diff` and `freeze.json`. The freeze receipt binds raw bytes/SHA pins for the five preceding evidence files and records `SYNTAX_DELTA_RETAINED`, exact-two-hunk equality, one product patch, `authorFrozen: true`, and no formatter/check/runtime execution. Directory permissions are0700; evidence was created O_EXCL0600. The author is frozen pending renewed authorization.

The old `nitro-legacy-media-format-source-tdiaae2h` BLOCKED stage, candidate, report and all prior source/read-repair images remain unchanged. No cleanup, failed-stage recreation or second product patch occurred.

## Handoff boundary

Product editing used `functions.patch`; only bounded Python-I-S-B source-file I/O, SHA-256 authentication and difflib capture ran otherwise. No formatter, type/lint/check/compiler, application evaluation/import, tests, browser, network, Engine, native SQL, private configuration/data inspection or nested agent ran. No other product file was inspected or edited; Auth4's disjoint work and the Widget3 report-only planner are outside this lease.

Coordinator next steps are independent source review, then fresh scoped validation after all reached Auth4/UI authors freeze. The supplied prior37/37 source-check evidence remains associated with its original bytes, not relabeled as validation of this after-image. Source/token **91/334** and runtime **0/9** remain unchanged; default Next, existing legacy reauthorization and native/through-COMMIT holds are untouched.
