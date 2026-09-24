# Coverage verification

> Original snapshot coverage. The [verification coverage](verification/COVERAGE.md) covers the refreshed136-issue /448-comment inventory.


Base commit: `60b4e980ed86a3b36d66bd1e25ee277e13836916`.

| Reviewer | Assigned | Reviewed | Comments read |
| --- | ---: | ---: | ---: |
| Initial reviewer | 27 | 27 | 96 |
| Luna 2 (maximum reasoning) | 27 | 27 | 89 |
| Luna 3 (maximum reasoning) | 27 | 27 | 78 |
| Luna 4 (maximum reasoning) | 27 | 27 | 85 |
| Luna 5 (maximum reasoning) | 27 | 27 | 94 |

Independent Luna/max audit covered **38 unique issues** in addition to the primary assignments. Parent reconciliation can refine audit recommendations; see PARENT-REVIEW.md and reviews/audit-*.json.

All checks below passed when this file was generated:

- The 135 downloaded open issue IDs exactly match the 135 assessments.
- Each issue occurs once, in its assigned reviewer batch.
- All 442 expected comments were downloaded; reviewer comment counts match each conversation.
- The downloaded comment IDs exactly match the issue timeline comment IDs.
- Issue and timeline source files still match their snapshot SHA-256 hashes.
- All assessments have a recognized category, disposition, confidence, conversation summary, evidence, and follow-up.

These checks establish inventory and report completeness. They do not independently prove that every reviewer interpretation is correct or that a runtime fix has passed. Source-level findings and any later audit corrections are reflected in the detailed report.

Rebuild with `python3 reports/v2-issue-triage/assemble.py` from the repository root.
