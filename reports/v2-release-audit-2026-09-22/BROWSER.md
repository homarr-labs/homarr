# Bounded public-preview browser audit

22 September 2026. Chrome 152, agent-browser 0.34.0, isolated session. No personal browser profile. Host Chromium sandbox startup failed; a temporary `--no-sandbox` session was used for the public demo. The session was closed afterward.

## Provenance and scope

Target: https://app-v2.preview.homarr.dev/ . Used the demo credentials publicly advertised on that login page. The deployed SHA was not exposed/proven; screenshots demonstrate this preview only, not `b90a704b2` or the latest stable release. The release article's other public demo URL also loaded a login page, but was not further tested.

No dashboard edits, integration writes, provider actions or AI requests were made. Login, viewport changes, accessibility scans and navigation overlays only. Screenshots contain mock/demo data. Only the initial viewport was visually inspected; screenshot coverage is not all 61 widgets.

## Checks

| Check | Result |
|---|---|
| Preview login, desktop 1440 × 1000 | Rendered, screenshot captured |
| Preview login, mobile 390 × 844 | Rendered; document scroll width 390 |
| Advertised demo account sign-in | Succeeded |
| Demo dashboard, mobile 390 × 844 | Rendered mock widget data; document scroll width 390 |
| Demo dashboard, desktop 1440 × 1000 | Rendered; document scroll width 1440; both rails visible in captured layout |
| Shift+C | Opened board switcher with a “Switch board” textbox |
| Ctrl+K | Opened command menu with search modes/results; no resource changes |
| Live providers / persistence / upgrades / touch dragging | Not exercised |

## Visual observations

The desktop capture also shows unusually oversized/truncated Downloads table headers (for example “Name P… D… E… S…”), and clipped Assistant prompt text in its compact card. These are concrete preview observations, not yet attributed to candidate source: board options, saved CSS or a different deployed build could explain them. Reproduce with a clean frozen-candidate fixture before filing a source regression. Width containment passing does not mean widget content is visually correct.

## Accessibility findings

Axe 4.12.1 on the login reports one violation category: button label contrast **3.59:1**, white on `#ee4e4e`, where the automated rule requires 4.5:1 for the observed font. Six other contrast nodes need manual review because backgrounds/overlap prevented measurement. The screenshot confirms the login surface; recheck final theme colors on the candidate.

Dashboard mobile: **12 violation categories**, 51 passing rules, 3 incomplete rules. Node counts can overlap and are not unique defects. Axe impact labels are automated accessibility severity, not security severity or manually verified release priorities.

| Rule | Axe impact | Reported nodes |
|---|---|---|
| aria-allowed-attr | critical | 6 |
| aria-conditional-attr | serious | 6 |
| aria-input-field-name | serious | 1 |
| aria-progressbar-name | serious | 38 |
| aria-prohibited-attr | serious | 1 |
| button-name | critical | 15 |
| color-contrast | serious | 29 |
| image-alt | critical | 39 |
| label | critical | 2 |
| nested-interactive | serious | 22 |
| region | moderate | 1 |
| scrollable-region-focusable | serious | 5 |

Prioritize labelled calendar navigation and table controls, progressbar names, editor/input names, semantic expansion roles, descriptive/decorative image treatment, nested focusable widgets, keyboard-scrollable regions and contrast. These observations contradict blanket accessibility-complete claims, but each selector requires source mapping and candidate verification before assigning a fix. Gradients and composite widgets generate manual-review items.

## Artifacts

- [Desktop login](evidence/preview-desktop.png), [mobile login](evidence/preview-mobile.png).
- [Desktop dashboard](evidence/dashboard-desktop.png), [mobile dashboard](evidence/dashboard-mobile.png).
- [Login axe evidence](evidence/preview-login-a11y.json).
- [Dashboard axe evidence](evidence/preview-dashboard-mobile-a11y.json).
