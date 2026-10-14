# 86: Compliance cards

**What to build:** Save protected PatchMon compliance/OS/update metrics and validated thresholds, then render accurate colored cards without widening anonymous access.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 30 options convert/save/reload with declared defaults/visibility, `OPTIONS_SUPER_REFINE` threshold ordering/modes and custom-enable conditions; old values are not silently normalized into different risk semantics.
- [ ] Compliance hero, host/update/security/repository/24h/package metrics and OS distribution/limit/version/display preserve units, absence and boundary colors in compact/advanced views.
- [ ] `getStats` remains a protected-session read with one compatible integration and use-before-secret; public-board or undefined-preview mounting never grants anonymous access, and forbidden/revocation clears cached compliance data.
- [ ] Actual query keys, effective refresh/demo behavior, save invalidation and approved request-local hydration/client splits retain ordinary stale results safely and dispose focus/poll registrations. Future focused threshold boundaries, denied public read, converted options and same-session recovery evidence runs at scoped target gates.

## Coverage

`patchmon` — 30: `showComplianceHero`, `showTotalHosts`, `showHostsNeedingUpdates`, `showSecurityUpdates`, `showUpToDateHosts`, `showHostsWithSecurityUpdates`, `showRecentUpdates24h`, `showTotalOutdatedPackages`, `showTotalRepos`, `enableThresholdColors`, `useCustomThresholds`, `hostsNeedingUpdatesThresholdMode`, `hostsNeedingUpdatesWarningAt`, `hostsNeedingUpdatesCriticalAt`, `securityUpdatesThresholdMode`, `securityUpdatesWarningAt`, `securityUpdatesCriticalAt`, `hostsWithSecurityUpdatesThresholdMode`, `hostsWithSecurityUpdatesWarningAt`, `hostsWithSecurityUpdatesCriticalAt`, `upToDateHostsThresholdMode`, `upToDateHostsWarningAt`, `upToDateHostsCriticalAt`, `totalOutdatedPackagesThresholdMode`, `totalOutdatedPackagesWarningAt`, `totalOutdatedPackagesCriticalAt`, `showOsDistribution`, `osDisplayMode`, `osDistributionLimit`, `showOsVersion`. Inputs consumed `switch`, `select`, `number`. Primary `widget.patchmon.getStats`; families `patchmon`, `mock`, one integration. #60 owns upstream metrics/auth, not merged here. Exact [PatchMon evidence](../drafts/widgets.md#widget-patchmon--protected-compliance-metrics-and-validated-thresholds).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md); server membership/kind/type/refinement validation and current saved/preview policy remain explicit.

## Required contracts

Initially unaccepted: #60 PatchMon result port; #40 trusted execution; #04/#09 protected principal/use/preview policy; #67 exact key/error/host; #68 option validation; #03 refresh; #07 units; #120 DTO contributions. Real protected identity/native/saved-card evidence is a later acceptance join, not every auth/provider completed to begin.

## Decision holds

Q11/Q12 stored thresholds/conversion, Q13 affected saves, Q15 protected-session continuity. Server validation/repair and SSR/freshness/demo policy remain held; a public-widget template cannot implicitly change PatchMon access.

## Ownership

#86 owns PatchMon definition/refinement/editor predicates and protected widget orchestration/rendering; #60 native provider, #68 option wrapper/#29 placement. COMPOSITION owns central assembly/dependencies; exclusive local allocation precedes dispatch.
