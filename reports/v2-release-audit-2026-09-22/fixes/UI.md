# UI and accessibility fixes

Validated against a clean seeded candidate at `http://localhost:3039` with a 390 × 844 mobile viewport and a 1440 × 1000 desktop viewport.

## Fixed

- Compact Downloads uses normal table headers and named progress indicators; the oversized header and nested header controls no longer occur in compact mode. Advanced mode retains draggable and resizable columns.
- Compact Assistant empty-state content fits inside the widget. Browser geometry confirmed the title, description, and all four suggestions remain inside the widget bounds.
- Login button contrast now passes axe in the clean fixture.
- Secondary text, compact stat labels, System Disks fills, and primary light variants now use contrast-safe theme colors.
- Added accessible names or semantics for Calendar navigation, notebook editing, selects, progress indicators, avatars, release images, board switching, and firewall meters.
- Scroll-area viewports are keyboard focusable.
- Removed invalid row expansion semantics and invalid Calendar hover-card ARIA while retaining the interactive event card.
- Updated the Assistant UI thread adapter for `unstable_subscribeThreadEvents`.
- Prevented the Next.js 16 proxy from reprocessing next-intl's internal locale rewrite while preserving canonical redirects for directly requested locale-prefixed URLs.

## Browser evidence

- Login: 0 axe violations in dark and a temporary light-theme spot check. Six nodes remain incomplete because axe cannot calculate the gradient background.
- Dashboard with its saved image background: 0 axe violations. Axe leaves 582 contrast nodes incomplete because it cannot calculate image and composite backgrounds.
- A temporary DOM-only solid `#242424` board background also reports 0 axe violations. It leaves 132 contrast nodes incomplete for content images and gradients. The temporary override was not saved.
- All source-mapped ARIA, control-name, image-alt, progress-name, nested-interactive, label, and scroll-region categories from the release audit are clear.
- Calendar event hover card opened with its event content and link after the ARIA correction.
- Existing release article images show the full-height Assistant and advanced Downloads layouts, so these compact-only fixes do not require replacing those assets.

Evidence:

- `../evidence/candidate-login-mobile-fixed.png`
- `../evidence/candidate-dashboard-mobile-fixed.png`
- `../evidence/candidate-dashboard-desktop-fixed.png`
- `../evidence/candidate-ui-a11y-summary.json`

## Focused validation

- `pnpm --filter @homarr/ui typecheck`
- `pnpm --filter @homarr/widgets typecheck`
- `pnpm --filter @homarr/nextjs typecheck`
- `pnpm exec vitest run apps/nextjs/src/proxy.spec.ts` — 8 passed
- `git diff --check`
