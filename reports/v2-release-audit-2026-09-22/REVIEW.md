# Candidate re-review — 2026-09-22

Reviewed the local release-audit changes against HEAD `b90a704b22467d4aba681ff5f03c3a8a0d359d40`: dependencies/lockfile, networking, Statistics providers/cache/UI, accessibility, proxy, Workshop and docs. Used the requested review-agent workflow for the read-only review, then repaired the findings under the user's explicit “and fix” instruction.

## Findings — all fixed

**[P1] Accept persisted Statistics snapshots without availability metadata — `packages/widgets/src/stats/component.tsx:160`**

The browser persists Statistics snapshots under an unchanged cache buster. An older snapshot lacks `unavailableMetrics`; direct `.length` and `.includes` access crashes rendering or its refresh effect after upgrading. Optional access now accepts this older shape in cards, table-record construction, details and refresh scheduling. A component regression reproduces the old cached shape and opens its details successfully.

**[P2] Keep a failed metric from marking healthy siblings unavailable — `packages/widgets/src/stats/component.tsx:387`**

Opening a failed metric passed its metric-level unavailable flag to the whole source details panel. That flag masked every healthy sibling value. Source availability and individual metric availability are now separate; the panel reads each metric's status independently. The regression opens the failed card and asserts its healthy sibling still displays 42.

**[P2] Preserve disk-card text contrast across both the fill and track — `packages/widgets/src/system-disks/component.tsx:159`**

The prior fix forced white text over a light unfilled track. It also left dark-theme green fills below the normal-text contrast threshold. Compact cards now use black text with pale fills in light mode and white text with darker fills in dark mode. Both background regions remain readable at zero, partial and full utilization.

## Verification

- Both new Statistics regression tests fail against the pre-fix behavior and pass after the repairs. [Before](fixes/review/regressions-before.log), [after](fixes/review/tests.log).
- Six focused tests pass: two Statistics component checks and four existing System Disks display checks.
- `@homarr/widgets` typecheck passes. [Log](fixes/review/typecheck.log).
- Rendered the actual private disk-card component in Chromium using an isolated fixture with mocked board/translation boundaries. Inspected light/dark screenshots at 0%, 25% and 100% utilization for healthy/unhealthy disks. Measured text against both computed background regions: minimum **5.21:1**. [Measurements](fixes/review/disk-contrast.json), [light](fixes/review/disks-light.png), [dark](fixes/review/disks-dark.png).
- Focused lint still reports seven errors and two warnings, all present in the prior unchanged-HEAD baseline. No findings in the new component spec. [Current](fixes/review/lint.log), [baseline](fixes/lint-baseline.log).
- `git diff --check` passes.

No further concrete regressions were identified in this review. This improves confidence in the candidate; it does not establish complete release acceptance. The large dependency update has not been exercised as a final production image, every provider/version has not been rerun live, and distributed refresh was not revalidated in this pass. Earlier audit limits and remaining dependency advisories still apply. The disk fixture is component evidence, not a new full-dashboard accessibility scan.
