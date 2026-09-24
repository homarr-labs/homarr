# Homarr V2 issue triage

**Current follow-up:** [final verification and fixes](final-verification/REPORT.md), [all 20 additional verifications](final-verification/20-VERIFICATIONS.md), [current category reports](final-verification/categories/), and [local release PR description](final-verification/PR-DESCRIPTION.md). Partial implementations count as addressed with their limitations retained. The source snapshot covers 136 issues and 448 comments; older reports below are preserved history.

Local, read-only GitHub triage against `release/v2` commit `60b4e980ed86a3b36d66bd1e25ee277e13836916` (17 September 2026).

Scope: the complete **open issue backlog**, excluding pull requests: **135 issues and 442 issue comments**. Closed historical issues are outside this snapshot; linked historical issues can inform individual assessments. Source bodies and all paginated comments are preserved in `source/<number>.json`, alongside 1,317 timeline events and 46 linked-PR metadata snapshots, with expected/downloaded counts and SHA-256 hashes in [the manifest](source/manifest.json).

The backlog is split into five batches of 27 complete conversations. An initial reviewer handles batch 1; four Luna reviewers at maximum reasoning handle batches 2–5. A fifth Luna reviewer at maximum reasoning independently audits proposed resolutions and selected ambiguous cases. Reviews run in waves because three sub-agent slots are available. The parent reviewer reconciles coverage, assembles category reports, and checks proposed V2 resolutions.

## Reading the report

- [Runtime validation and image provenance](RUNTIME-VALIDATION.md): distinguishes historical screenshots, source findings, and runtime results.
- [V2 capabilities](V2-CAPABILITIES.md): orientation to the actual reviewed branch.
- `REPORT.md`: consolidated report, category/status counts, V2 resolution candidates, and every issue's detailed assessment.
- `categories/`: the same assessments grouped as integration requests, bugs, annoyances, quality of life, large features, documentation, and other issues.
- `reviews/batch-N.md` and `.json`: reviewer assessments after reconciliation.
- `reviews/audit-*.json`: independent Luna/max audit findings; parent reconciliation records any subsequent refinements.
- [Parent review](PARENT-REVIEW.md): classification and evidence corrections.
- `COVERAGE.md`: exact inventory and comment reconciliation.
- `source/`: issue bodies, complete issue-comment conversations, assignments, and snapshot manifest.

## Assessment rules

- **Addressed in V2**: concrete implementation covers the reported request or failure; describe it as “will be fixed with V2,” not as a GitHub closure. This can include fixes already present in V1; it does not claim V2 introduced every fix.
- **Partially addressed**: V2 handles some requirements, but the conversation contains remaining requirements or only a narrower implementation exists.
- **Not addressed**: current implementation still has the reported limitation or the requested native capability is absent.
- **Needs verification**: source inspection cannot establish the outcome, especially environment-dependent regressions, performance, or incomplete reproduction details.

Confidence (high / medium / low) is confidence in that disposition, **not a numerical probability or proof of runtime success**. A high-confidence “not addressed” is not a fix candidate. A related rewrite, release-note claim, or Custom Widget workaround is insufficient evidence of a fix. MySQL removal requires migration and is not itself a repair of MySQL failures.

Each entry summarizes the issue and subsequent conversation, cites V2 source evidence, and records remaining validation or follow-up. Selected screenshots for #3731, #962, #6811, and #6559 were downloaded and visually inspected; their hashes and source URLs are in the manifest. Other attachments and external services are not assumed verified merely because their links occur in the downloaded conversation. No browser, live integration, build, or end-to-end tests had run at the original snapshot. Subsequent isolated builds and bounded runtime checks are documented in the current follow-up. Five direct assertions against the V2 Nextcloud URL helper passed; see [validation details and limits](RUNTIME-VALIDATION.md). No GitHub issue, label, comment, PR, or repository setting was modified.
