# 06: Locale selection, switching and RTL

**What to build:** Guests and users select and persist locale coherently through navigation/reload, with matching first-paint language/direction and intentional handling of unsaved work, load failure and concurrent changes.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Resolve explicit supported input/cookie/configured default/English through the approved precedence and negotiation policy; invalid/case/encoded values and API/static/onboarding/login exclusions have deterministic outcomes without invented legacy redirect requirements.
- [ ] Preserve guest-capable `homarr.locale` preference with one-year/Lax/root-or-base-path semantics or approved conversion; locale is not silently moved to a new user column or tied to authentication.
- [ ] Switching commits messages/resources/provider and HTML lang/dir coherently, or uses an approved reload; query/hash/history/cross-tab and dirty editor/modal/form outcomes are specified, with no stale completion reverting a newer selection.
- [ ] Hebrew RTL is correct before JavaScript and after hydration and changes with document/provider together; selected real grid/portal/keyboard consumers verify direction rather than assuming all Mantine/custom CSS mirrors automatically.
- [ ] Locale-dependent queries/loaders/render variants invalidate independently; pending/no-op/race/resource failure expose retryable states, and cold request, switch and reload demonstrate the same selected locale using future focused critical-flow evidence.

## Coverage

**I18N-02**: resolver, locale cookie/persistence, `useCurrentLocale`/`useCurrentIntlLocale`, switch coordinator, lang/dir descriptors and initial DirectionProvider snapshot, old middleware/routing capability disposition. Evidence: [core I18N-02](../drafts/core.md), [localization §1 locale/RTL rows](../../../research_notes/Homarr%20full%20Nitro%20migration/localization-ui.md).

## Required contracts

#01 request/document/provider/effects; #05 loader/catalog metadata; #07 formatting resource identity; #17 validated culture/default projection; #22 typed navigation/query/history; #28/#08 dirty-work callbacks only for selected consumers; #24 Crowdin DOM activation boundary. Review each consumed revision without waiting for all locale/UI owners.

## Decision holds

Prefix/negotiation/precedence, cookie conversion/base-path, SPA switch versus reload, cross-tab behavior, unsaved-work retention and RTL/Crowdin mutation boundary remain human choices. Q13 matters only to the editor-draft handoff used here; router convention, Mantine and use-intl are settled.

## Ownership

Exclusive locale selection/persistence/switch coordinator; root HTML/provider installation belongs COMPOSITION, formatting resources #07, actual feature RTL callers their owners. Dispatch waits on applicable choices, accepted used interfaces and allocation; no checks or browser actions during publication.
