# Issue tracker: GitHub

Issues and specs live in [homarr-labs/homarr](https://github.com/homarr-labs/homarr/issues). Use the `gh` CLI for issue operations. Run from this checkout or pass `--repo homarr-labs/homarr`.

## Conventions

- Create: `gh issue create --title "..." --body-file /tmp/issue.md`.
- Read: `gh issue view <number> --comments`; also fetch labels with `--json number,title,body,labels,comments` when triaging.
- List: `gh issue list --state open --json number,title,body,labels`; narrow by label when needed.
- Comment: `gh issue comment <number> --body-file /tmp/comment.md`.
- Labels: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`; use [the configured mappings](triage-labels.md).
- Close: `gh issue close <number>`; implemented changes first require [reporter acceptance](triage-labels.md#test-readiness-and-reporter-feedback).

When a skill says to publish to the issue tracker, create a GitHub issue. When it says to fetch a ticket, read the issue and its comments.

## Pull requests as a triage surface

**PRs as a request surface: yes.** Include all open PRs awaiting review, including collaborator PRs, when the maintainer requests the review queue. Explicitly named PRs are always in scope.

GitHub shares issue and PR numbers. Resolve ambiguous references with `gh pr view <number>`, falling back to `gh issue view <number>`.

## Wayfinding operations

For `wayfinder`, keep one map issue labelled `wayfinder:map` with Notes, Decisions-so-far, and Fog. Link child tickets as native sub-issues, using `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.

Use native issue dependencies for blockers. If sub-issues or dependencies are unavailable, use a task list in the map, `Part of #<map>` in each child, and `Blocked by: #<number>` in dependent tickets.

Choose the first open, unassigned child in map order whose blockers are closed. Claim it with `gh issue edit <number> --add-assignee @me`. Record findings in the child and a concise pointer in the map. Implementation tickets follow the reporter acceptance rule before closure.
