# Release/v2 delta verification

Baseline: `60b4e980ed86a3b36d66bd1e25ee277e13836916` (the original 135-issue assessment). Reviewed range: `60b4e980ed86a3b36d66bd1e25ee277e13836916..681c1dd15a5d4753c04a84f7cb92a60e47a2c360`. Current revision in every row: `681c1dd15a5d4753c04a84f7cb92a60e47a2c360`.

The JSON contains exactly 135 rows, one per assessment. `changed_since_baseline` is true when an issue-specific implementation path or a newly ingested issue conversation changes the review evidence. It does not mean the issue is fixed or that this pass supplied browser, deployment, integration, or end-to-end proof.

## Material deltas

- **#6600 remains partially addressed.** Commit `b55ed9d5f` adds independent bookmark title visibility and an 8–32px title-size control, and the renderer consumes them. The refreshed reporter response says the result is “much much better,” invalidating the earlier title-control gap. The umbrella's demo-auth, world-clock, Media Releases, Docker, ultrawide, and endurance subtopics still need separate verification.
- **#4815 remains partially addressed.** Commit `b09d13c0c` makes add/edit previews inherit the target board section/canvas sizing. It does not add the requested ordinary fresh-install showcase seed.
- **#5387 remains not addressed.** Commit `f8854a893` improves notification formatting and Gotify deletion, while the native Pushover integration remains absent.
- **#2861 has stronger but bounded evidence.** A fresh user comment says the V2 demo scales as expected in a simple layout; nested/container and migrated-board behavior remains unverified, so the partial disposition is retained at medium confidence.
- **#6152 remains not addressed.** A contributor says they are working on Wazuh compatibility, but no implementation is merged or present in this range.
- **#3140, #3778, #1014, #6620, and #4543 were touched or semantically adjacent without changing their dispositions:** the new paths do not establish stale-save/public-reload/skeleton fixes, board-level open-in-new-tab defaults, HTML bookmark import/export, or a regression of embedded app editing.

The other 125 rows are unchanged. Their findings explicitly cite the baseline assessment and the absence of an issue-specific path or new conversation change. Broad documentation, Workshop/launch-menu, CI, dependency-lock, and branding edits were reviewed as release changes but did not supply issue-specific implementation evidence for those rows.

Suggested status counts across all rows remain: `needs-verification` 23, `not-addressed` 50, `addressed-in-v2` 33, `partially-addressed` 29.

No tests, builds, browser runs, deployments, GitHub writes, prior-report edits, or application changes were performed.

