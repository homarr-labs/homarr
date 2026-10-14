# EXPANSION35: Kubernetes frontend freeze

## Delivery boundary

`apps/nitro/src/features/kubernetes/` contains an unmounted React/Mantine feature, pure presentation models, reusable table/read-state/cluster components and direct typed oRPC query options. `KubernetesFeature` requires a caller-supplied `KubernetesClient`, opaque non-secret `authorityKey`, requested context ID and context-change callback. It does not create a transport, endpoint, provider, route or backend client.

The client type is inferred with `RouterClient<ReturnType<typeof createKubernetesProcedures>>`; outputs use `InferClientOutputs`. The Kubernetes candidate currently has no package public export or declared Nitro workspace dependency. The sole cross-package source reference is type-only in `contracts.ts`. Establishing that public contract/dependency boundary remains a host-owned join, not a runtime import or a completed production binding.

## Actual views and eleven read leaves

| View                     | Native leaf                                   | Returned presentation                                                                                                           |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Contexts and selector    | `kubernetes.contexts.getContexts`             | Names, context IDs, availability, metrics status, default metadata                                                              |
| Cluster                  | `kubernetes.cluster.getCluster`               | Context name, providers, version, architecture, node count, returned capacity measures                                          |
| Cluster inventory counts | `kubernetes.cluster.getClusterResourceCounts` | Eight source resource counts and local inventory navigation                                                                     |
| Nodes                    | `kubernetes.nodes.getNodes`                   | Readiness, name, nullable CPU/memory usage percentages, OS, pod capacity, architecture, version, creation timestamp             |
| Namespaces               | `kubernetes.namespaces.getNamespaces`         | Name, actual string-or-undefined phase, creation timestamp                                                                      |
| Pods                     | `kubernetes.pods.getPods`                     | Name, namespace, images, server-resolved workload type, status, creation timestamp                                              |
| Services                 | `kubernetes.services.getServices`             | Name, namespace, type, ports, target ports, cluster IP, creation timestamp                                                      |
| Ingresses                | `kubernetes.ingresses.getIngresses`           | Name, namespace, class, ordered hosts and service/port backends, creation timestamp                                             |
| Secrets                  | `kubernetes.secrets.getSecrets`               | Name, namespace, type, creation timestamp only                                                                                  |
| ConfigMaps               | `kubernetes.configMaps.getConfigMaps`         | Name, namespace, creation timestamp only                                                                                        |
| Volumes                  | `kubernetes.volumes.getVolumes`               | Persistent-volume-claim inventory: name, namespace, phase, storage, class, mode, bound volume, access modes, creation timestamp |

All eleven leaves have real asynchronous call sites. Contexts load before context-specific components mount; no empty-string context request, hardcoded cluster, seeded data or demo response is supplied. Search runs over explicit presentation fields. Empty inventories, no search matches, initial skeleton loading, paused/offline fetches, background updates and masked read failures have separate states. Tables use native horizontal scrolling and explicit column/caption semantics.

## Source behavior retained

- Source reference: `apps/nextjs/src/app/[locale]/manage/tools/kubernetes/`, `packages/api/src/router/kubernetes/`, `packages/api/src/nitro/routers/kubernetes.ts` and its `-kubernetes` helpers/resources.
- Context precedence is a configured requested ID, configured persisted ID, configured default ID, then first configured ID. The source `homarr-kubernetes-context` local-storage key remains a non-authoritative preference, validated against each returned enumeration. The host callback owns URL selection/canonicalization; other search parameters are not changed here.
- Context enumeration retains the source thirty-second refresh policy. Inventory reads retain mount/focus/reconnect refresh and the source error-only thirty-second refresh. These are read-query refreshes, not Kubernetes watches. No extra API actions, mutation calls, create/delete controls, log viewers or credential editing are introduced.
- Namespaced inventories and source counts cover all namespaces. Search is local filtering, not a new namespace-restricted request. Nodes and namespace lists are cluster-wide. Volumes mean PVCs, not a new persistent-volume endpoint.
- Cluster CPU/memory `Reserved` and `Used` measures retain the native amounts, percentages, units and their distinct source denominators. Missing metrics omit native CPU/memory usage measures; missing node metrics stay unavailable, never fabricated zero usage. The visual progress track alone is bounded to 0–100; its text retains the returned percentage. Source warning thresholds remain above 50 and at least 65. Node `podsCount` comes from capacity, so it is labeled pod capacity, not running pods.
- Pod workload type is displayed exactly as returned. Helm labeling takes precedence in the source; owner references are examined in source order, direct supported owners win when encountered, ReplicaSet parent resolution happens server-side, and failed ReplicaSet reads permit the next owner. The frontend performs no private ownership join, parallel owner reinterpretation or additional read.
- Secret and ConfigMap models explicitly allowlist metadata fields. No values, base64 data, token, kubeconfig, reveal/copy-secret control or raw-object renderer exists. Ingress hosts/backends are text, not unchecked externally navigable URLs.
- Namespace output remains inferred `string | undefined`. Known statuses can receive semantic badges; unknown phases display unchanged, missing phases display “Not reported.” The legacy `KubernetesNamespaceState` assertion is not recreated and static narrow parity remains held.

## Remaining typed-error and private-authority joins

The shared native error mapper still masks internal source messages. Every query catches rejection before storing a cache error, keeps only a safe local error kind/message, and drops message/data/cause/stack from the source exception. Only actual oRPC error codes for authentication, permission, unavailable context/route and invalid input select specific safe wording. Other exceptions remain generic. No browser error-message extraction, raw-error rendering or server-mask bypass exists. This does not establish exact legacy error text, structured domain-error parity or a procedure-declared typed error union; those remain held.

The host must still own admin authorization, guarded demo policy, Kubernetes enablement, private principal and context enumeration, configured/default contexts, credential ownership, request leases, concrete clients, abortable five-second metrics probes, cancellation/disposal and ReplicaSet diagnostics. Browser AbortSignals are forwarded to oRPC, but do not prove that host lifecycle binding exists. `authorityKey` must identify the current authority generation without containing credentials, and the host must retire prior query caches on authority transitions. Local storage and a selectable context are never authorization.

No shared route/provider/manifest, legacy implementation, API/Core or native-client file is changed. No active peer feature is imported. Mounting, navigation topology, authentication/availability shell and cache retirement remain unjoined. English labels, absolute UTC creation timestamps and basic searchable Mantine tables are the delivered presentation; legacy localization, relative-time display, MRT grouping, inert row selection and click-to-copy parity are not claimed. Source-only libraries absent from the Nitro manifest are not silently introduced.

## Dependency and documentation evidence

The existing Nitro manifest declares React 19.2.7, Mantine core/hooks 9.6.0, oRPC client/server 2.0.0-beta.43 and TanStack Query 5.101.2. No dependency or manifest change is made. UX guidance was loaded and the existing Mantine provider/source table conventions were read. The configured Mantine MCP was not available in this session and Context7 returned a quota limit; official [Mantine Table](https://mantine.dev/core/table/), [Mantine Select](https://mantine.dev/core/select/), [oRPC clients](https://orpc.dev/docs/client/client-side) and [TanStack Query state guidance](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries) were read, with installed Mantine/oRPC declarations checked for the used APIs.

This freeze records implementation coverage, not live acceptance. No tests, build/install, browser session, live Kubernetes/provider call, environment/credential read, data mutation, listener, Git operation or nested delegation is part of this lane.

## Required validation results

Scoped Kubernetes oxlint completed without diagnostics. Repository instructions required lint/typecheck despite the lane's no-check request. The Nitro package typecheck stopped at an unrelated syntax error in `apps/nitro/src/features/apps/search.tsx:38`; that peer file was not read or changed. A separate typecheck rooted at the Kubernetes entrypoint produced no Kubernetes diagnostics, but failed on five existing transitive UniFi integration errors caused by missing `@homarr/node-unifi` declarations. No dependency installation, declaration workaround or peer repair was performed. These results do not establish a clean package typecheck or browser/live acceptance.
