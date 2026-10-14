# 116 — Complete Docker tools runtime

## What to build
Own real Docker endpoint/client runtime, inventory/health/reconciliation/discovery, authorized batch actions, history/live log producer and management clients/UI with bounded cancellation and late-setup cleanup.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary OPS-03; Docker is outside IntegrationKind89, not another provider owner's work. docker.reconcileServices, getServiceHealth, refreshInventory, getContainers, getEndpoints, startAll, stopAll, restartAll, removeAll, logs, subscribeLogs (11). Own Docker inventory and container-log pages plus Docker recovery boundary; configured endpoint identity/client registry/lifetime/capability flags, selection/filtering, discovery labels/grouping, reviewed app creation and container/name/tail links. #78 owns dockerContainers widget/options; #110 consumes discovery. #124 transports operational events but does not own the log producer.

## Required contracts
Initially unaccepted: #04 admin/current endpoint capability before secret/client access; #01 runtime/env/signal contribution; #03 bounded inventory/history state; #35 reviewed canonical createMany/app constructors; #124 container-log event/disposal interface; #22 typed search and #05–08 terminal/confirm/notify ports. Supply endpoint/inventory/action/log/discovery revisions to #78/#110 before whole ticket completion is required.

## Decision holds
Q14 selected log host/framing, runtime-enabled/configuration/endpoint/action policy and Docker SDK/native compatibility evidence. Q11/Q12 if persistent endpoint/app references change; approved destructive confirmation/ambiguous-write policy. No live Docker mutation is authorized by publication.

## Ownership
Own clients/runtime registry/service guts, producer and full tools UI, correcting the draft's orphan handoff. #78 owns widget rendering, #35 app commands, #124 transport framing, COMPOSITION mounts/configures dependencies. Actual endpoint→inventory/actions/logs/discovery UI is bounded production acceptance; #125 is separate convergence.

## Acceptance criteria
- [ ] Configured real client/runtime adapter returns endpoint-qualified inventory/health/reconciliation/refresh to tools clients, sanitizes errors and handles disabled/unavailable Docker without fake success or secret configuration leakage.
- [ ] Batch start/stop/restart/remove checks current admin/endpoint capability, confirms destructive operations and reports typed per-target partial/ambiguous failures without unsafe retries; refresh affects only intended endpoint consumers.
- [ ] History/live producer and actual client honor endpoint/container/name/tail and bounded ordering, terminal resize/filter/error/reconnect; abort before or after asynchronous setup, late setup completion and unmount dispose readers/clients/subscriptions exactly once.
- [ ] Discovery→review→canonical app creation and #110 discovery use the same bounded runtime service; #78 consumes qualified inventory/actions without a duplicate engine or untrusted endpoint-name identity.
- [ ] Focused future denied remove, partial batch, unavailable endpoint and early/late log/discovery cleanup regressions prove the complete client/service/UI path on disposable endpoints, not real containers or broad Docker suites.
