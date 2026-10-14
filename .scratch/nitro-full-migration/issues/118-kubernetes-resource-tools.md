# 118 — Kubernetes resource tools

## What to build
Own six resource client adapters, authorized result services and screens for Kubernetes workload/network/storage/config/secret inspection within the selected context, including safe failure cleanup and sensitive projections.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary OPS-05. kubernetes.pods.getPods, services.getServices, ingresses.getIngresses, volumes.getVolumes, configMaps.getConfigMaps, secrets.getSecrets (6). Own all six corresponding resource page families and reusable clients/adapters, native details/links/actions only where actual source UI demonstrates them; no invented write/control API. #117 owns context/config/client acquisition and sole layout/shell. Read-heavy counts alone cannot replace resource tables, and secret/config values need deliberate authorized projections.

## Required contracts
Initially unaccepted: #117 configured-context acquisition/query identity/cancel/errors and screen registration; #04 resource/secret-read projection policy; #120 typed procedure/errors, #122 curated wrapper only for selected clients; #05–08/#22 table/filter/navigation/time ports. Accept context revision before #117 whole topology completes; no integration-provider owner is assumed.

## Decision holds
Explicit configMap/secret sensitive projection/permission and demonstrated source-action disposition, SDK adapter/version evidence and relevant locale/time behavior. Q12 only where saved resource/context references need conversion; external MCP OAuth scope applies only to that exposure. No live cluster mutation or public generic ops reader is approved.

## Ownership
Own all six resource client adapters/services/screens/descriptors, not merely browser adapters. #117 owns shared context shell/config, #04 policy, #122 curated protocol dispatch and COMPOSITION central registration/exports/dependencies. Real readers + authorized screens in the shell are production joins; #125 is final convergence.

## Acceptance criteria
- [ ] Each named adapter reaches actual context-scoped results and its screen handles meaningful data/detail/links plus empty/loading/typed unavailable errors; generic resource counts do not stand in for six tools.
- [ ] Context/filter switches rekey/cancel safely, preserve intended navigation and discard stale results from other contexts; abort/failure/late acquisition releases adapter resources without duplicate listeners or clients.
- [ ] Secret/configMap content uses current deliberate resource projections and permissions before read; no broad public/admin-independent access, credential-bearing error or unreviewed write action is exposed.
- [ ] Focused future denied-secret/foreign-context/cancel races plus one relevant disposable client-to-screen scenario per resource family verify all six, including curated dispatch where selected, without broad cluster E2E or live mutations.
