# Required independent final review

Two independent GPT-6 Luna reviewers read the complete immutable merge-base diff and relevant callers after retained source is finalized and rebased onto current dev. They have no edit/test/build/measurement permission. Review the generated JSON structurally in full against canonical data rather than treating the one-line diff as unreviewable. Review all changed executable code, error/authorization/cache/required-UI behavior and the qualified evidence.

If a concrete regression is identified, fix it and obtain read-only re-review of the correction. Final archival/removal commits must leave the same reviewed production diff; compare the complete diff hash and confirm delivery SHA. Reviewer reports record exact baseline/head/source-diff hash, issues or explicit no actionable findings, and material untested behavior.
