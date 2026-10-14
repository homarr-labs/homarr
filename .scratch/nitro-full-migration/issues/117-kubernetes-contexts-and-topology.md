# 117 — Kubernetes contexts and topology

## What to build
Own Kubernetes configuration/context clients and the sole local tools context shell, with permitted cluster topology/counts/nodes/namespaces and safe switching, disabled/error recovery and lifetime cleanup.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary OPS-04. kubernetes.contexts.getContexts, nodes.getNodes, cluster.getCluster, cluster.getClusterResourceCounts, namespaces.getNamespaces (5). Own Kubernetes root/cluster dashboard, nodes, namespaces pages, Kubernetes layout/context selection and cluster recovery boundary; error-only cluster-dashboard is not an invented extra page. Own configured context/client registry, safe projections, topology counts and disposal. No Kubernetes IntegrationKind exists. #118 owns six resource clients/screens and supplies local descriptors to this shell.

## Required contracts
Initially unaccepted: #04 admin/runtime/context policy and secret/config references; #01 env/signal/lifecycle contribution; #03 context-qualified query identity/refresh; #118 screen descriptor/resource context request interface; #120 typed errors and #05–08/#22 tables/navigation/formatting. Supply config/context/client acquisition/cancel/error revisions to #118/#110 without requiring completed topology UI.

## Decision holds
Kubernetes SDK/config/native runtime compatibility, explicit enabled/current-context and sensitive topology projection policy. Q12 configuration/reference conversion if durable inputs change; locale/formatting scope remains held where necessary. No unapproved cluster write/control capability is added.

## Ownership
Own Kubernetes client/config/context guts and feature shell/topology services/UI; no phantom integration owner. #118 owns its adapters/screens, COMPOSITION central mounts/dependencies. Real context→topology and resource-shell joins are production evidence, not circular start blockers; #125 separately closes product convergence.

## Acceptance criteria
- [ ] Actual context/config clients provide all five authorized leaves and meaningful topology/node/namespace/count screens with typed denied/invalid/unavailable/disabled results, not empty route placeholders.
- [ ] Switching contexts rekeys/cancels old requests and cache identity so late results cannot mix clusters; acquired clients/config resources dispose on abort/unmount/shutdown, including late setup.
- [ ] Kubeconfig/server credentials never enter SSR bootstrap, browser storage or generic errors; deliberate topology projections, links/search/loading/table/formatting affordances reach the actual UI.
- [ ] #118 descriptors mount in the single shell and #110 capability probes consume its public-safe interface; focused future context-switch race, denied/disabled and unavailable-reader regressions use disposable clients without real cluster mutation.
