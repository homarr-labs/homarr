# Triage Labels

The skills speak in terms of five canonical triage roles. All five exist in Linear,
one label per role, with the label string equal to the role name.
These roles are a convention, not an exhaustive inventory of workspace/team labels.

| Role              | Label in Linear   | Meaning                                  |
| ----------------- | ----------------- | ---------------------------------------- |
| `needs-triage`    | `needs-triage`    | Maintainer needs to evaluate this issue  |
| `needs-info`      | `needs-info`      | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified, ready for an AFK agent  |
| `ready-for-human` | `ready-for-human` | Requires human implementation            |
| `wontfix`         | `wontfix`         | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the
corresponding label string from this table.

## Where they live

Team `AJN` (Ajnart) in the `ajnart` Linear workspace.

- `needs-triage` — `1c3e264c-e3d4-476e-8207-030fd283ef1c`
- `needs-info` — `ff309bc1-bc0a-4457-9ede-c1bf23b97c7f`
- `ready-for-agent` — `76f18bd7-325b-4c32-9788-a076a114925b`
- `ready-for-human` — `0f42cebd-b81e-493a-8d7f-0a8de2302b53`
- `wontfix` — `695af732-1a4c-4a21-811b-b65ae21a7b2b`

For current scope, pagination and retirement checks, use the
[label discovery guidance](./issue-tracker.md#discover-labels-in-the-teams-scope).

## What was retired

The recorded 2026-10-10 retirement covered 31 issue labels, including
`needs triage`, `Migrated`, `enhancement`, `Bug`, the size set `XS`–`XL`,
the terminal-state labels `DONE` and `WON'T DO`, and the
pipeline labels `confirmed`, `fix-merged`, `exploration-done`, `decision` and
`waiting-for-reporter`. Five project size labels (`XS`–`XL`) were retired too.
This was not deletion or removal of every pre-existing label: the scoped inventory
also contains labels without `retiredAt`, such as `invalid` and `in-progress`.

Some encoded what Linear models as fields: sizes belong in the estimate field,
and `Done`, `Canceled` and `Duplicate` are statuses. Retirement keeps labels visible
on issues that already carry them, while preventing application to new issues.
For example, AJN-440 still carries the retired `needs triage` label.

If one of these is ever needed again, `restore_issue_label` un-retires it by id.
