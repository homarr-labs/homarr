# Triage Project automation

The `[Triage] Project sync` workflow mirrors [triage state labels](triage-labels.md) into an organization Project's `Status` field. Labels are authoritative; dragging a card does not change them.

## Setup

Set repository variable `TRIAGE_PROJECT_NUMBER` to the Project number from its URL. `TRIAGE_PROJECT_OWNER` defaults to `homarr-labs`. Create these exact `Status` options:

| Label                            | Status             |
| -------------------------------- | ------------------ |
| `needs triage`                   | Needs triage       |
| `specced-out`                    | Ready to implement |
| `waiting-for-reporter`           | Waiting for reply  |
| `needs info from the maintainer` | Needs maintainer   |
| `wontfix`                        | Not planned        |
| Closed                           | Done               |

Closed items with `wontfix` or a `not_planned` closure reason remain **Not planned**. Open items without a triage state enter **Needs triage** without adding a label; conflicting states are skipped. Supplementary labels such as size and `ready for test` do not choose a column. Initial bulk backfill includes only open items with existing triage state labels.

Install or reuse a GitHub App on the organization with organization **Projects: read/write** and repository **Issues: read** and **Pull requests: read**, limited to this repository. This repository reuses the installed `homarr-update-contributors` App through existing repository variable `HOMARR_UPDATE_CONTRIBUTORS_CLIENT_ID` and secret `HOMARR_UPDATE_CONTRIBUTORS_PRIVATE_KEY`. Accept updated permissions on the App installation after changing its registration. The workflow creates a short-lived installation token and revokes it after the job. The exact permission inputs follow [the token action's definition](https://github.com/actions/create-github-app-token/blob/v3/action.yml).

Alternatively, set secret `TRIAGE_PROJECT_TOKEN` to a dedicated PAT with organization Projects read/write and access to this repository's issues and PRs. It is also the fallback if App authentication fails. Expiring PATs need renewal. The repository `GITHUB_TOKEN` only changes labels and cannot access Projects. See [GitHub's Projects automation guidance](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions).

Missing Project configuration skips board synchronization with a workflow notice; reply label handling still runs. A configured but inaccessible Project or missing Status option fails the run. Run the workflow manually with an issue/PR number to retry a sync, or leave the input empty to backfill up to 500 open items with existing triage states. Historical closed items are not backfilled.

## Automatic transitions

- A human original author's new top-level **Conversation** comment on an open issue or PR changes the single `waiting-for-reporter` state to `needs triage`. Bot/App comments and replies with an AI-generation disclaimer are ignored. Comments predating the current waiting label are ignored, including delayed workflow events. Inline review replies are not handled.
- A new PR head removes testing labels applied before that push and returns the item to `needs triage` when no newer triage state is present. Delayed events for older heads and readiness labels reapplied after the push are preserved; same-second chronology is treated conservatively. Stale supplementary `ready for test` is also removed under a maintainer hold or `wontfix`, while those primary states are preserved. Conflicting primary states are preserved.

Events queue per item rather than replacing a pending reply. Label writes preserve unrelated labels and recheck current states before adding `needs triage`, but separate GitHub API calls are not atomic. A failed write fails the run. Manually dispatching a specific item number repairs an open item's missing triage state by adding `needs triage` before syncing; bulk backfill does not repair labels. Existing states, holds, conflicts, and closed items are preserved.

A reply requests re-triage; it never establishes acceptance. The workflow does not post comments, approve, merge, close, or mark an image ready. It runs only trusted `dev` metadata code and never checks out or executes PR code.
