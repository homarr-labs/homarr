# Statistics presentation review

2026-09-18, `feat/new-integration-stats`.

Scope: the revised statistics component, provider details, styles, options, translations, shared card-shell change, and their catalog/snapshot/refresh paths. Reviewed read-only using the `review-agent` procedure, then applied corrections separately. This is not a fresh audit of all external provider implementations.

## Result

No remaining actionable findings in this scope.

Corrections made during review and validation:

- Advanced mode initially displayed full numbers while its local compact-number switch inherited the compact board setting. The switch now reflects the active view's formatting.
- Compact column counts now follow displayed metrics; hidden or unused integrations no longer reserve empty columns.
- Hover details prioritize the focused metric and cap long catalogs at eight fields, with an explicit advanced-view hint. Advanced view retains the complete catalog.
- Keyboard-focusable cards retain accessible hover details, with the lint exception attached to the actual focus property.

## Evidence

- Real browser manual refresh: 24 cards, 23 unique integration instances, 23 refresh operations, maximum one operation per instance. Both Trilium cards share one refresh. Hover and advanced panels render the existing catalog and snapshot data without per-metric query hooks.
- Advanced DOM: 23 provider panels and 86 metric fields; no refresh dates or test-name prefixes.
- Local hide/reorder: rendered cards changed from 24 to 23 and order changed; SQLite retained all 24 saved entries, their original order, and zero hidden entries.
- Widget and Next.js typechecks passed; focused translation checks passed (638); focused lint and formatting passed.

The snapshot polling query can re-read Redis as it ages; this does not contact the upstream service. A provider may require multiple distinct API endpoints for one source snapshot. Existing server locks deduplicate concurrent source refreshes and bound upstream concurrency to four sources.

Residual boundary: this is a real development-instance browser check and source review, not a production build or exhaustive test of every provider version. Your Spotify remains blocked on external credentials as documented in the live validation report.
