# Triage labels

Map canonical skill roles to these exact GitHub label strings.

| Label in mattpocock/skills | Label in our tracker             | Meaning                                                                                    |
| -------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| `needs-triage`             | `needs triage`                   | Maintainer needs to evaluate the report                                                    |
| `needs-info`               | `needs info from the maintainer` | Implementation waits for maintainer clarification or a decision                            |
| `ready-for-agent`          | `specced-out`                    | Scope, expected behavior, and acceptance criteria are clear enough to implement            |
| `ready-for-human`          | `waiting-for-reporter`           | The implemented change has a published demo image and awaits reporter testing and feedback |
| `wontfix`                  | `wontfix`                        | The report will not be actioned                                                            |

Use `specced-out` when the specification is ready for implementation. The canonical `ready-for-human` role means reporter validation after implementation in this repo; map it to `waiting-for-reporter`, not a human implementation label.

## Sizes and weights

Assign exactly one size label once scope is understood. Estimate implementation effort, affected scope, and uncertainty together. Weights are relative planning units, not priority or promises of elapsed time.

| Label     | Weight | Typical scope                                                                      |
| --------- | ------ | ---------------------------------------------------------------------------------- |
| `size:XS` | 1      | A tiny, well-understood change in one place                                        |
| `size:S`  | 2      | A small change in one feature with few moving parts                                |
| `size:M`  | 3      | A moderate change across several related modules                                   |
| `size:L`  | 5      | A substantial change across package boundaries or with significant uncertainty     |
| `size:XL` | 8      | A large or poorly bounded change; split into smaller tickets before implementation |

Apply the existing `good first issue` label to XS and S implementation issues with a complete specification and a self-contained scope. Remove it when the issue becomes M, L, or XL, or needs substantial prerequisite knowledge. Re-estimate the size when scope changes and replace the previous size label.

## Test readiness and reporter feedback

- `ready for test`: the implementation PR has passing required checks and a published test image for its current head. Apply to the PR when these conditions hold.
- `waiting-for-reporter`: the implemented change has a published demo image and the linked report awaits reporter testing and feedback. Apply to the issue after providing the reporter with the image and reproduction steps.

These states describe testing and feedback; they do not establish acceptance. Remove `ready for test` when a new commit needs fresh checks or publication.

After the reporter accepts the fix and it is merged, close the issue as completed and remove the pending state label. `wontfix` is for rejected or unactioned reports, not accepted fixes.

Reuse existing labels by exact name. Create a missing configured label only when an authorized triage operation needs it; do not create synonymous labels.
