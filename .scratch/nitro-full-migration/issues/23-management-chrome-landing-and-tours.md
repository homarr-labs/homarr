# 23: Management chrome, landing and tours

**What to build:** Deliver capability-aware management/home statistics, responsive management and board chrome, breadcrumbs, setup guidance and durable board/management tours, including completion/reset services and the profile reset control.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Authorized home statistics count apps, boards, groups, integrations, invites, media, search engines and users within the caller's scope, refresh after relevant mutations and show recoverable failures without leaking protected records or counts.
- [ ] Landing/navigation supports create-only, delegated-integration, logs-only and self-profile capabilities; breadcrumbs, help/About, header zones/shortcuts/branding and responsive keyboard/focus behavior work in both shell families. Endpoint/deep-link authorization is independent of menu visibility.
- [ ] Current-user tour status/complete/reset services preserve converted management/board flags durably, deny cross-user changes and refresh the right status after reset. #16 hosts the exported reset control without duplicating tour persistence.
- [ ] Management welcome/boards/apps/integrations/users list/create steps and board search/edit/settings/user-menu steps use permitted targets, bounded route/target waiting and cleanup. Skip/done/back/keyboard, typing-field exclusion, branding/docs links and approved guest/mobile behavior work without replaying completed tours.
- [ ] First-board/setup guidance and management pending/error/not-found recovery retain contextual navigation and correct SSR status. Focused future restricted-count, tour completion/reset and route-unmount regressions demonstrate real authorized services and target elements.

## Coverage

SHELL-03, all OPS-08, landing portion of OPS-09 and tour portions of ADMIN-04: primary `home.getStats`, `user.getTourStatus`, `user.completeTour`, `user.resetTours`; management landing/layout/scoped fallback, common board header slots, setup checklist and first-board affordances. Docker/Kubernetes recovery, identity actions and onboarding progression remain their respective owners.

## Required contracts

#04's caller-scoped capability/demo policy; #02's user-tour fields and scoped count repositories; #22's targets/navigation; #05/#08's localized overlay ports; #16's reset-control hosting and header preferences; #26's board-change capability; #109's setup-state projection. #01 accepts local chrome/routes/SSR-status descriptors. Only exact accepted revisions gate consumers, not whole peer completion.

## Decision holds

Navigation discoverability/source discrepancies, guest tour behavior, tour redesign/mobile policy and unavailable target dispositions require approval. Detailed locale/SSR first-paint and private-count freshness/revocation policy remain held where used; Q12 controls converted flag preservation, not an assumed import mechanism.

## Ownership

One local writer owns navigation/tour metadata, landing/count orchestration, tour service/endpoints/UI/reset component and focused regressions. #16 owns its page host, #02 physical fields; #01 alone composes root SSR/providers/central routes/manifests. Feature routes use descriptive folder-based names, ignored helpers and proper layout/pathless/non-nested/dynamic semantics. Exclusive files and accepted contracts must be recorded before dispatch.
