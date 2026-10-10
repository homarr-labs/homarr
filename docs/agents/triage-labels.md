# Triage Labels

The skills speak in terms of five canonical triage roles. All five exist in Linear,
one label per role, with the label string equal to the role name.

| Role                       | Label in Linear      | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the
corresponding label string from this table.

## Where they live

Team `AJN` (Ajnart) in the `ajnart` Linear workspace.

- `needs-triage` — `1c3e264c-e3d4-476e-8207-030fd283ef1c`
- `needs-info` — `ff309bc1-bc0a-4457-9ede-c1bf23b97c7f`
- `ready-for-agent` — `76f18bd7-325b-4c32-9788-a076a114925b`
- `ready-for-human` — `0f42cebd-b81e-493a-8d7f-0a8de2302b53`
- `wontfix` — `695af732-1a4c-4a21-811b-b65ae21a7b2b`

## What was retired

On 2026-10-10 the pre-existing taxonomy was retired to make room: 31 issue labels
including `needs triage` (141 issues), `Migrated` (93), `enhancement` (43), `Bug`
(36), the size set `XS`–`XL`, the terminal states `DONE` and `WON'T DO`, and the
pipeline labels `confirmed`, `fix-merged`, `exploration-done`, `decision` and
`waiting-for-reporter`. Five matching project labels were retired too.

They had encoded as labels what Linear models as fields: sizes belong in the
estimate field, and `Done`, `Canceled` and `Duplicate` are statuses. Issues still
carry the retired labels; retired labels simply no longer appear in the picker.

If one of these is ever needed again, `restore_issue_label` un-retires it by id.
