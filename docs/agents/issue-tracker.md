# Issue tracker: Linear (agents) + GitHub (inbound)

Work is tracked in Linear. GitHub is the public reporting trail. Look for an
existing Linear issue before creating one for a GitHub report.

## Platform

Linear's official remote MCP server `linear` (https://mcp.linear.app/mcp),
authenticated by OAuth as the signed-in user. Tools are namespaced `linear.*`.

- Workspace `ajnart` — `4f320a6f-6539-4681-b709-516de518c1c7`
- Team `AJN` (Ajnart) — `00ec7bbd-aea8-4587-a61b-a37911124f25`

Identifiers look like `AJN-123`.

## Imported GitHub reports

AJN-440 is an observed import example: it carries
an attachment titled `#7128 bug: Widgets overlap` pointing at
https://github.com/homarr-labs/homarr/issues/7128, with the report body and an
image in its description. This example does not establish integration configuration,
coverage of other reports, sync latency, or synchronization of later edits/comments.

Read the existing Linear issue when available; follow its GitHub attachment for
missing context and later discussion. If no import is found, preserve the original
GitHub link when creating the Linear issue rather than assuming a mirror exists.

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

The five canonical triage roles are defined in [Triage Labels](./triage-labels.md).
They are not the complete label inventory. That document also records the bounded
retirement scope; retirement preserves existing issue assignments rather than
deleting labels.

### Discover labels in the team's scope

Use `list_issue_labels` with `team: "00ec7bbd-aea8-4587-a61b-a37911124f25"`
(or the team name `Ajnart`). The `team` field accepts a name or ID. `limit` defaults
to 50, with a maximum of 250. While `hasNextPage` is true, pass the returned
`cursor` to the next call and preserve the same scope and filters.

`includeArchived` defaults to false; use true when investigating historical labels.
`includeGroups` defaults to false; use true to include groups, marked `isGroup`,
which cannot be applied directly. A label with `retiredAt` cannot be applied to new
issues. Check retirement separately from `archivedAt`.

Before concluding that a label is absent or creating a similarly named label,
check the scope, filters and all pages. An issue's `labels` array shows its existing
assignments, including retired labels, not the full inventory. A partial result
does not establish a fixed cache or a broken label-discovery tool.

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
