# GitHub conversations and Project operations

Run these examples from a Homarr checkout or pass `--repo homarr-labs/homarr`. Replace example numbers and timestamps with the current task. Keep snapshots in the OS temporary directory; do not commit a session ledger or handoff as part of an unrelated fix.

## Read a complete delta

```bash
# Updated includes replies and closures; created-only searches miss follow-ups.
gh api 'repos/homarr-labs/homarr/issues?state=all&since=2026-10-20T22:00:00Z&sort=updated&direction=desc&per_page=100' --paginate

# This REST endpoint includes both issues and PRs; pull_request identifies a PR.
gh api 'repos/homarr-labs/homarr/issues/7258/comments?per_page=100' --paginate
gh api 'repos/homarr-labs/homarr/issues/7258/events?per_page=100' --paginate

# PR Conversation is not the whole review discussion.
gh pr view 7260 --repo homarr-labs/homarr --comments
gh api 'repos/homarr-labs/homarr/pulls/7260/reviews?per_page=100' --paginate
gh api 'repos/homarr-labs/homarr/pulls/7260/comments?per_page=100' --paginate
gh pr diff 7260 --repo homarr-labs/homarr
gh pr view 7260 --repo homarr-labs/homarr --json headRefOid,isDraft,mergeable,statusCheckRollup
```

Inspect complete bodies/replies for selected work, including unresolved review threads when deciding readiness. Use the GraphQL `reviewThreads` connection if resolution state is needed. GraphQL unions require `... on Issue` / `... on PullRequest` fragments for their fields.

`--paginate` emits one JSON document per page. Use a compatible CLI's `--slurp` or explicitly decode all pages; do not parse only the first document. For missing PR checks, inspect Actions runs for the exact `head_sha`: fork runs awaiting approval may not appear in `statusCheckRollup`.

## Locate and read the board

The configured board is [Homarr triage](https://github.com/orgs/homarr-labs/projects/6), with [open Kanban](https://github.com/orgs/homarr-labs/projects/6/views/2) and [all tracked items](https://github.com/orgs/homarr-labs/projects/6/views/1). Verify the live variables rather than carrying IDs or column counts from a previous session:

```bash
gh variable list --repo homarr-labs/homarr --json name,value \
  --jq '.[] | select(.name | startswith("TRIAGE_PROJECT_"))'

# Current owner/number shown here; adapt to the configured values.
gh api graphql --paginate -f owner=homarr-labs -F number=6 -f query='
  query($owner: String!, $number: Int!, $endCursor: String) {
    organization(login: $owner) {
      projectV2(number: $number) {
        id title url
        items(first: 100, after: $endCursor) {
          nodes {
            id isArchived
            content {
              ... on Issue { number url state }
              ... on PullRequest { number url state }
            }
            fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }'
```

Cross-check the issue's current labels/state with the card. The mapping lives in [the automation contract](../../../../docs/agents/triage-project.md), not this reference. **Done** is tracker closure/merge, not proof of reporter acceptance or release. **Not planned** also covers closed `not_planned` issues; a missing primary label on an open item maps to Needs triage. Conflicting primary labels leave the card unchanged.

## Diagnose before repairing

```bash
gh run list --repo homarr-labs/homarr --workflow triage-project.yml --limit 10
gh run view RUN_ID --repo homarr-labs/homarr
gh run view RUN_ID --repo homarr-labs/homarr --log
```

Check `.github/workflows/triage-project.yml` and `.github/scripts/triage-project.cjs` on current `dev` for exact behavior. Read step outcomes and notices: authentication failure, missing configuration, conflicting labels, and a missing Status option require different recovery. Avoid echoing credentials while diagnosing.

With authorization to synchronize/repair:

```bash
# Specific sync also adds needs triage to an OPEN item with no primary state.
gh workflow run triage-project.yml --repo homarr-labs/homarr --ref dev -f number=7258

# Bulk: up to 500 OPEN items already carrying a canonical state label.
gh workflow run triage-project.yml --repo homarr-labs/homarr --ref dev
```

Manual sync mirrors current labels; it does not replay old comments or determine acceptance. Specific dispatch can mutate labels; bulk is not a complete import of all open/unlabelled or historical closed items. Separate label and Project calls are not atomic. Re-read after a failure, resolve the observed cause, and retry the affected item once; if the same failure repeats, report it with the run link and leave it unresolved. Inspect each resulting card before declaring recovery.

For an explicitly requested full initial import, discover current item/field/option IDs and add the selected issue/PR node IDs with `addProjectV2ItemById`, then set Status using the current mapping. That mutation reuses an existing card for the same content. Read back the item, Status, and paginated Project membership. Preserve unrelated cards and record every acknowledged item ID so partial failures can be diagnosed without a destructive reimport. Do not replace Status options or delete/recreate the board during routine sync.

If individual stored item nodes are correct but the Project connection is empty, distinguish stored writes from visible membership. Verify the correct owner/Project/filter, archived state, and pagination; recheck once. Preserve the receipts and report the discrepancy rather than repeatedly deleting/re-adding cards. A historical GitHub indexing incident is not proof of a current outage.

## Credentials and permissions

The current workflow reuses `homarr-update-contributors`: variable `HOMARR_UPDATE_CONTRIBUTORS_CLIENT_ID`, secret `HOMARR_UPDATE_CONTRIBUTORS_PRIVATE_KEY`. The generated Project token requests organization Projects write and repository Issues/Pull requests read. Its broader App capabilities do not grant this workflow permission to edit code or merge. Repository `GITHUB_TOKEN` performs label changes; it cannot access organization Projects.

Local `gh` Project authorization and Actions App authorization are separate. `gh auth refresh -s project` addresses a confirmed local Project-scope error only; it does not fix Actions. After an App permission change, compare its registration with the organization installation's accepted permissions. Reuse existing credentials; do not export a broad personal CLI token into Actions secrets or attempt to retrieve stored private keys. Follow [setup documentation](../../../../docs/agents/triage-project.md) if configuration actually needs changing.
