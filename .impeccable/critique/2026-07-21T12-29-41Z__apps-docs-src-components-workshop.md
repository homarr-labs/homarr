---
target: Workshop store in the docs
total_score: 38
p0_count: 0
p1_count: 0
timestamp: 2026-07-21T12-29-41Z
slug: apps-docs-src-components-workshop
---
# Workshop Store Critique — Post-Polish

## Design Health Score

| # | Heuristic | Score | Evidence |
|---|---|---:|---|
| 1 | Visibility of system status | 4/4 | Loading, initial failure, stale refresh failure, empty, and results states are mutually exclusive; recovery actions are visible. |
| 2 | Match between system and real world | 4/4 | Actions describe their result: Download widget JSON, Copy CSS, View details, and Install in Homarr. |
| 3 | User control and freedom | 4/4 | Filters can be cleared, errors retried, dialogs cancelled, and destructive submission deletion requires explicit confirmation. |
| 4 | Consistency and standards | 4/4 | Creation and revision editing share CodeMirror, buttons follow the shared system, and cards use a predictable responsive grid. |
| 5 | Error prevention | 3/4 | Validation, disabled progression, pending states, RLS, and confirmations are strong; disabled form progression could explain unmet requirements more explicitly. |
| 6 | Recognition rather than recall | 4/4 | Persistent labels, type descriptions, step status, source previews, and installation instructions minimize recall. |
| 7 | Flexibility and efficiency | 4/4 | Search spans title, description, and author; signed-in filtering, sorting, responsive controls, and direct detail actions support repeat use. |
| 8 | Aesthetic and minimalist design | 3/4 | The catalog is restrained and scannable; long source documents and the complete creator form necessarily remain dense on small screens. |
| 9 | Help users recover from errors | 4/4 | Route, listing, edit, report, copy, OAuth, and detail failures remain local and provide a clear next action. |
| 10 | Help and documentation | 4/4 | The detail page explains the exact Homarr destination and links to updated Workshop documentation. |
| **Total** |  | **38/40** | **Release-quality; minor polish remains** |

## Anti-Patterns Verdict

The surface is product-led rather than decorative. The redesign removes the overloaded card footer, hover scaling, tiny touch controls, public moderation details, contradictory states, and ambiguous install actions. The deterministic Impeccable detector reports zero findings.

## What Improved

1. The production route no longer collapses into the Docusaurus crash screen without recovery. A route-local boundary protects navigation, and the fresh-volume production path renders without console errors.
2. Loading, failure, empty, stale-results, and populated states are truthful and mutually exclusive.
3. Search and filters form a clear responsive hierarchy. Mobile targets are 40–44 pixels, signed-out users do not see Yours, and cards no longer overflow at 390 pixels.
4. Cards prioritize evaluation: title, author, type, score, description, comments, and View details. Copy, download, reporting, editing, and deletion moved to the detail page.
5. The detail page now teaches the installation journey and names its primary action precisely.
6. Reports and reporter identities are admin-only through PocketBase rules. Public catalog UI no longer turns reports into social proof.
7. The creator and revision dialogs share the CodeMirror editor, use bounded internal scrolling, expose pending/error states, and avoid step-selection layout shifts.

## Remaining Minor Opportunities

### P2: Explain disabled progression inline

The Type and Details steps are understandable, but a disabled Next button could state the missing requirement for keyboard and first-time users. This is a refinement, not a blocker, because required fields and validation messages are already present.

### P2: Consider a compact source summary on very small screens

The read-only source viewer is intentionally complete and horizontally scrollable. A future collapse/expand summary could reduce page length for nontechnical visitors without hiding inspection entirely.

## Verification Evidence

- Fresh Docker Compose PocketBase volume and production docs image.
- Populated catalog with widget, CSS, and outdated examples.
- Desktop and 390px mobile layouts in light and dark themes.
- Widget detail, installation instructions, CodeMirror source view, and comments.
- Signed-in submission wizard through Type and Details, including the shared editor.
- Zero browser console errors after the final fixes.
- Impeccable deterministic detector: zero findings.

## Compatibility Note

An existing local development volume created from an earlier unreleased version of the reset migration still has a stale Workshop view. It is intentionally not migrated or deleted. A fresh volume created from the current unreleased migration is the supported validation target and works correctly.
