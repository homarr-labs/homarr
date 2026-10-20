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

Closed items with `wontfix` or a `not_planned` closure reason remain **Not planned**. Open items with missing or conflicting state labels are skipped; supplementary labels such as size and `ready for test` do not choose a column.

Install a dedicated GitHub App on the organization with organization **Projects: read/write** and repository **Issues: read** and **Pull requests: read**, limited to this repository. Set repository variable `TRIAGE_APP_CLIENT_ID` and secret `TRIAGE_APP_PRIVATE_KEY`. The workflow creates a short-lived installation token and revokes it after the job. The exact permission inputs follow [the token action's definition](https://github.com/actions/create-github-app-token/blob/v3/action.yml).

Alternatively, set secret `TRIAGE_PROJECT_TOKEN` to a dedicated PAT with organization Projects read/write and access to this repository's issues and PRs. It is also the fallback if App authentication fails. Expiring PATs need renewal. The repository `GITHUB_TOKEN` only changes labels and cannot access Projects. See [GitHub's Projects automation guidance](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions).

Missing Project configuration skips board synchronization with a workflow notice; reply label handling still runs. A configured but inaccessible Project or missing Status option fails the run. Run the workflow manually with an issue/PR number to retry a sync, or leave the input empty to backfill up to 500 open items with existing triage states. Historical closed items are not backfilled.

## Automatic transitions

- A human original author's new top-level **Conversation** comment on an open issue or PR changes the single `waiting-for-reporter` state to `needs triage`. Bot/App comments and replies with an AI-generation disclaimer are ignored. Comments predating the current waiting label are ignored, including delayed workflow events. Inline review replies are not handled.
- A new PR head removes stale `ready for test` and `waiting-for-reporter` labels and returns the item to `needs triage`. A delayed event for an older head is ignored. Explicit maintainer holds, `wontfix`, and conflicting triage states are preserved.

A reply requests re-triage; it never establishes acceptance. The workflow does not post comments, approve, merge, close, or mark an image ready. It runs only trusted `dev` metadata code and never checks out or executes PR code.
