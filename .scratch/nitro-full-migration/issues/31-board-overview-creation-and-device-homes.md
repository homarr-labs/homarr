# 31: Board overview, creation and device homes

**What to build:** List/create/duplicate permitted boards and choose desktop/mobile homes with accurate previews, canonical destinations and caller/target validation using the single user/group/instance preference authorities.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Overview/previews/counts/creator/public/home badges/menus reflect allowed scope, including intended non-admin access; unauthorized records are not disclosed by direct endpoints or public overview substitutions.
- [ ] Inline create handles debounced/stale availability, name/columns/public fields, cancel/reset/rekey and pending/errors, returning canonical IDs and an encoded usable destination without rebuild.
- [ ] Duplicate requires create plus source access and preserves intended content/layout relationships with fresh canonical IDs transactionally; only real success refreshes catalogs and notifications.
- [ ] Own desktop/mobile home command orchestration through #16 user writes/clear semantics, #15 ordered group defaults and #17 instance defaults. Approved target-user access/null-default behavior updates both home entries, picker/Spotlight/card badges and effective device precedence.
- [ ] Failed create/duplicate/home writes preserve recoverable input and truthful badges. Focused future restricted overview, durable duplicate and home-change/reload regressions join authorized repositories and real previews rather than fixture-only cards.

## Coverage

BOARD-06: primary `board.getManageOverview`, `createBoard`, `duplicateBoard`, `setHomeBoard`, `setMobileHomeBoard`; management overview/cards/inline create, create-trigger search contribution, duplication and home commands. #26 owns home resolution/read catalogs, #34 delete/ACL/rename, #27 preview geometry. Preference owners retain their underlying writes; no second home-policy implementation.

## Required contracts

#26's canonical read/preview/home/effects; #27's preview geometry; #02/#04's compound board constructor/policy; #16's user preference write/clear; #15/#17's effective group/instance defaults; #22/#08's list/form/modal and #38's catalog invalidation interface. Only exact accepted revisions are required.

## Decision holds

Target-user versus caller visibility, public/group/instance home constraints, null clearing and device fallback source discrepancies need explicit disposition. Q12 controls duplication/reference conversion; Q11 only concrete adapter choice. SSR preview freshness/personalization remains held where used.

## Ownership

One local writer owns overview/create/duplicate/home orchestration/services/endpoints/UI/focused regressions; underlying preference services remain #16/#15/#17, deletion #34. #02 writes physical schema; #01 alone composes root SSR/providers/central routes/manifests. Descriptive folder-based routes/ignored helpers respect proper layout/pathless/non-nested/dynamic semantics. Accepted contracts and exclusive allocation precede dispatch; old URLs need no aliases.
