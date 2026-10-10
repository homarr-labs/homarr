# Issue tracker: Linear (agents) + GitHub (inbound)

Work is tracked in Linear. GitHub is where users report problems, and a Linear
GitHub integration already mirrors those reports into Linear automatically, so
copying them across is nobody's job.

## Platform

Linear's official remote MCP server `linear` (https://mcp.linear.app/mcp),
authenticated by OAuth as the signed-in user. Tools are namespaced `linear.*`.

- Workspace `ajnart` — `4f320a6f-6539-4681-b709-516de518c1c7`
- Team `AJN` (Ajnart) — `00ec7bbd-aea8-4587-a61b-a37911124f25`

Identifiers look like `AJN-123`.

## The GitHub mirror

A GitHub report already has a Linear issue by the time you see it. AJN-440 carries
an attachment titled `#7128 bug: Widgets overlap` pointing at
`github.com/homarr-labs/homarr/issues/7128`, with the issue body and user-attached
images imported. Read GitHub only for what the mirror did not carry: later comments,
edits, and the surrounding discussion.

So: a report from a user is read in Linear, and its GitHub attachment is the trail
back to the original thread.

## Tools

| Verb | Tool |
| --- | --- |
| Workspace | `get_workspace` |
| Teams | `list_teams`, `get_team` |
| Issue labels | `list_issue_labels`, `save_issue_label`, `retire_issue_label`, `restore_issue_label` |
| Issue statuses | `list_issue_statuses`, `get_issue_status` |
| Read one issue | `get_issue` |
| List / search issues | `list_issues`, paginated with `cursor` until `hasNextPage` is false |
| Create or update an issue | `save_issue` — omit `id` to create, pass it to update |
| Comment | `save_comment` |
| Attach a file | `create_attachment_from_upload` |
| Issue templates | `list_templates` |

The server's own instructions warn that string values must be sent literally:
real newlines in markdown bodies, not escaped `\n`.

## Statuses (team AJN)

`Backlog` · `Todo` · `In Progress` · `In Review` · `Done` (completed) ·
`Canceled` · `Duplicate`

Closing means `Done` when the work shipped, `Canceled` or `Duplicate` when it did
not. Comment before cancelling — a silent cancel leaves the reporter guessing.

## Labels

Exactly five exist: the triage roles in `docs/agents/triage-labels.md`. On
2026-10-10 the pre-existing taxonomy was retired wholesale, because it used labels
for things Linear already models as fields — `XS`–`XL` for estimates, `DONE` and
`WON'T DO` for status.

### `list_issue_labels` cannot be trusted

It returns a fixed partial set and omits labels that are actively applied to issues.
It hid `needs triage` while 141 issues carried it, which is how a duplicate
`needs-triage` got created. Never use it to decide whether a label exists.

Ground truth for labels is the `labels` array on issues returned by `list_issues`.

## Conventions

- **Create an issue**: `save_issue`. Title states the problem; body carries
  reproduction, expected/actual, and links. Team is `AJN`.
- **Read an issue**: `get_issue` by identifier (`AJN-123`).
- **List / search**: `list_issues`, filtered by status and label. Exclude `Done`,
  `Canceled` and `Duplicate` for the open queue. Paginate; the workspace holds
  hundreds of issues.
- **Comment**: `save_comment` on the issue.
- **Apply / remove labels**: `save_issue` with label ids.
- **Sub-issues and relations**: Linear's native parent/child and blocks/blocked-by
  relations, which are the UI-visible representation.

## When a skill says "publish to the issue tracker"

Create a Linear issue with `save_issue`.

## When a skill says "fetch the relevant ticket"

Read it from Linear with `get_issue`.
