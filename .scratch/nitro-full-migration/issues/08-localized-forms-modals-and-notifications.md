# 08: Localized forms, modals and notifications

**What to build:** Real authorized forms and stacked confirmations present localized validation and asynchronous recovery while preserving drafts/focus and one notification lifecycle. This named shared UI expansion retains Mantine primitives; feature forms and actions stay feature-local.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Form/request-scoped Zod issue localization preserves paths/params/explicit messages/transforms, controlled/uncontrolled/blur/caller options and structured server issues; concurrent languages and locale-switched errors never mutate a render-time global error map.
- [ ] Custom modal stack preserves keepMounted drafts, close interception/onClose, current-only focus trap and z-index/footer/confirm behavior; async-confirm failure keeps the dialog open and restores correct focus, including RTL.
- [ ] Notifications retain full data/icons/colors/pending/success/error behavior with one root provider/style lifecycle, no SSR imperative firing and no duplicate hydration/replay notifications.
- [ ] One real administrative form plus a real feature confirm mutation demonstrates authorized persistence, structured issues, loading/failure/retry, retained draft and coherent post-success effects rather than only a synthetic component rendering.
- [ ] Future focused validation-isolation/draft/focus/error regressions exercise the critical flow; owner callbacks support board availability, app create-another, icon/media progress, password fields, quick-add, Docker removal and media-search confirmation without this ticket rewriting those features.

## Coverage

**I18N-05**: `useZodForm`/validation issue mapping, base custom modal creator/reducer/confirm/footer, notification wrapper/styles and pure UI overlay/theme export contribution. Evidence: [core I18N-05](../drafts/core.md), [localization §3 shared frontend](../../../research_notes/Homarr%20full%20Nitro%20migration/localization-ui.md).

## Required contracts

#01 provider placement/replay/effects; #05 scoped translator/types; #06 direction/locale revisions; #120 structured issues/error shape; selected #13/#14/#35 or other feature service supplies authorized mutation and success/invalidation callbacks, with #22 navigation only if consumed. Review each narrow used interface; no dependency on all forms, assets or transports finishing.

## Decision holds

Any deliberate draft-close/async-confirm/focus or notification redesign needs disposition; selected locale-switch dirty-work behavior follows #06 and editor timing only follows Q13 when consumed. Retaining Mantine is not an open choice. Publication proves no UI runtime behavior.

## Ownership

Base form/validation/modal/notification modules only; feature collections and services remain with their named owners. COMPOSITION alone installs providers/styles/dependencies. Dispatch needs exclusive allocation, applicable decisions and accepted consumed revisions; no broad UI/test split.
