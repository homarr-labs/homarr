# 75: DNS and smart-home controls

**What to build:** Persist DNS/entity/automation selections, render permitted summaries/states and invoke explicit authorized controls with visible results and precise invalidation.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All nine options round-trip with compatible/required selections and single Home Assistant constraint; labels/units/clickability, DNS colors/layout and compact/advanced controls retain distinct meaning and placement/type validation.
- [ ] DNS summaries preserve multi-provider partial results; per-target/all enable/disable and duration enforce use before secret and interact on every actual target, with pending/errors and no read-only/demo upstream mutation.
- [ ] Entity details/state use exact entity keys and zero backend TTL, switch respects clickable/interact policy, and automation runs provide explicit effect/success/failure feedback without a fabricated periodic read.
- [ ] Mutations invalidate actual matching summary/entity consumers; 10s DNS polling, effective entity refresh and demo/manual recovery are reconciled, with forbidden/session clearing, approved hydration and cleanup. Future focused denied-action, multi-target failure and exact invalidation evidence uses safe disposable automations at scoped target gates.

## Coverage

`dnsHoleSummary` (2): `usePiHoleColors`, `layout`; `dnsHoleControls` (1): `showToggleAllButtons`; `smartHome-entityState` (4): `entityId`, `displayName`, `entityUnit`, `clickable`; `smartHome-executeAutomation` (2): `displayName`, `automationId`. Inputs consumed `switch`, `select`, `text`. Primary leaves `widget.dnsHole.summary/enable/disable`, `widget.smartHome.entityState/entityDetails/switchEntity/executeAutomation`; includes source-only entityState read disposition, not merely current browser calls. DNS families `piHole`, `adGuardHome`, `technitiumDns`, `mock`; smart-home `homeAssistant`, `mock` (one integration).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md), [home-control evidence](../drafts/widgets.md#widget-home-controls--dns-and-home-assistant-reads-with-guarded-actions).

## Required contracts

Initially unaccepted: #53 DNS result/action/session DTOs; #56 entity/automation ports; #40 permission-before-secret execution; #04 use/interact/demo/preview authority; #67 exact keys/status/error host; #68 option service; #27/#28 board effects; #03 bounded refresh; #07/#08 units/action feedback; #120 typed service contribution. Later real target-control joins are acceptance, not native blockers or all 89 providers completed.

## Decision holds

Q11/Q12 saved-option conversion, Q13 affected saves; deliberate real-world action/confirmation/demo and preview policies, SSR/freshness/polling overrides remain scoped holds. Q15 applies to session invalidation paths only.

## Ownership

#75 owns saved-placement query/action orchestration and four renderers; #53/#56 own upstream protocols. #68 common options, #29 placement; COMPOSITION owns mounting/shared exports. Exclusive local files and accepted revisions are required before dispatch.
